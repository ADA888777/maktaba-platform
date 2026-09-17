import { Router } from 'express';
import {
  booksRepo, categoriesRepo, eventsRepo, projectsRepo, resourcesRepo, surveysRepo,
  type CategoryKind, type ListQuery, type LibraryEvent, type Survey,
} from '../repositories/index.js';
import { getSettings } from '../services/settings.js';
import { getPublicStats } from '../services/analytics.js';
import { relayAvailability } from '../services/forms.js';
import { RESOURCE_ICONS, VISIT_FREQUENCIES, VISIT_REASONS, VISIT_SERVICES } from '../constants.js';
import { notFound, parseId } from '../utils/http.js';

export const publicRouter = Router();

const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 120) : undefined);
const num = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined);

const baseQuery = (q: Record<string, unknown>): ListQuery => ({
  publicOnly: true,
  search: str(q.search),
  page: num(q.page),
  pageSize: num(q.pageSize) ?? 24,
  sort: str(q.sort),
});

publicRouter.get('/config', (_req, res) => {
  const s = getSettings();
  res.json({
    site: s.site,
    lists: s.lists,
    borrow: s.borrow,
    visit: s.visit,
    notifications: s.notifications,
    relay: { borrow: relayAvailability('borrow'), visit: relayAvailability('visit') },
    options: { visitReasons: VISIT_REASONS, visitServices: VISIT_SERVICES, visitFrequencies: VISIT_FREQUENCIES, resourceIcons: RESOURCE_ICONS },
  });
});

publicRouter.get('/stats', (_req, res) => {
  res.set('Cache-Control', 'no-store').json(getPublicStats());
});

publicRouter.get('/categories', (req, res) => {
  const kind = str(req.query.kind) as CategoryKind | undefined;
  res.json(categoriesRepo.list(kind && ['book', 'resource', 'project'].includes(kind) ? kind : undefined)
    .map(({ id, name, kind: k }) => ({ id, name, kind: k })));
});

/* ─── الكتب ─── */
publicRouter.get('/books', (req, res) => {
  const q = baseQuery(req.query);
  q.filters = { categoryId: num(req.query.categoryId), specialty: str(req.query.specialty) };
  const status = str(req.query.status);
  if (status === 'available') q.where = { sql: 'books.copies_available > 0', params: [] };
  if (status === 'unavailable') q.where = { sql: 'books.copies_available = 0', params: [] };
  res.json(booksRepo.list(q));
});

publicRouter.get('/books/:id', (req, res) => {
  const book = booksRepo.get(parseId(req.params.id));
  if (!book || !book.isActive) throw notFound('الكتاب');
  res.json(book);
});

/* ─── المصادر الإلكترونية ─── */
publicRouter.get('/resources', (req, res) => {
  const q = baseQuery(req.query);
  q.filters = {
    resourceType: str(req.query.resourceType),
    specialty: str(req.query.specialty),
    categoryId: num(req.query.categoryId),
  };
  res.json(resourcesRepo.list(q));
});

/* ─── المشاريع ─── */
publicRouter.get('/projects', (req, res) => {
  const q = baseQuery(req.query);
  q.filters = {
    specialty: str(req.query.specialty),
    projectType: str(req.query.projectType),
    categoryId: num(req.query.categoryId),
  };
  const result = projectsRepo.list(q);
  // إخفاء اسم الفريق إذا لم يُسمح بعرضه
  result.items = result.items.map((p) => (p.showTeam ? p : { ...p, teamName: '' }));
  res.json(result);
});

/* ─── الفعاليات: القادمة والسابقة تُحسب لحظيًا من التاريخ ─── */
export type EventPhase = 'upcoming' | 'ongoing' | 'past';
export function eventPhase(e: LibraryEvent, now = new Date()): EventPhase {
  const start = new Date(e.startsAt).getTime();
  const end = e.endsAt ? new Date(e.endsAt).getTime() : start + 2 * 60 * 60 * 1000; // مدة افتراضية ساعتان
  const t = now.getTime();
  if (t < start) return 'upcoming';
  if (t <= end) return 'ongoing';
  return 'past';
}

const endExpr = `COALESCE(events.ends_at, strftime('%Y-%m-%dT%H:%M:%fZ', events.starts_at, '+2 hours'))`;

publicRouter.get('/events', (req, res) => {
  const q = baseQuery(req.query);
  const scope = str(req.query.scope) === 'past' ? 'past' : 'upcoming';
  const now = new Date().toISOString();
  q.filters = { department: str(req.query.department), specialty: str(req.query.specialty) };
  q.where = scope === 'past' ? { sql: `${endExpr} < ?`, params: [now] } : { sql: `${endExpr} >= ?`, params: [now] };
  q.sort = scope === 'past' ? 'latest' : 'soonest';
  const result = eventsRepo.list(q);
  res.set('Cache-Control', 'no-store').json({ ...result, items: result.items.map((e) => ({ ...e, phase: eventPhase(e) })) });
});

publicRouter.get('/events/:id', (req, res) => {
  const e = eventsRepo.get(parseId(req.params.id));
  if (!e || !e.isPublished) throw notFound('الفعالية');
  res.json({ ...e, phase: eventPhase(e) });
});

publicRouter.get('/notifications', (_req, res) => {
  const { notifications } = getSettings();
  if (!notifications.enabled) return void res.json([]);
  const now = new Date();
  const until = new Date(now.getTime() + notifications.daysAhead * 86400000).toISOString();
  const items = eventsRepo.list({
    publicOnly: true,
    pageSize: 10,
    sort: 'soonest',
    where: { sql: `${endExpr} >= ? AND events.starts_at <= ? AND events.status != 'cancelled'`, params: [now.toISOString(), until] },
  }).items;
  res.set('Cache-Control', 'no-store').json(items.map((e) => ({ ...e, phase: eventPhase(e, now) })));
});

/* ─── الاستبيانات ─── */
export function surveyState(s: Survey, today = new Date().toISOString().slice(0, 10)): 'upcoming' | 'ended' | 'active' {
  if (today < s.startDate) return 'upcoming';
  if (today > s.endDate) return 'ended';
  return 'active';
}

publicRouter.get('/surveys', (req, res) => {
  const q = baseQuery(req.query);
  q.pageSize = 100;
  const result = surveysRepo.list(q);
  const order = { active: 0, upcoming: 1, ended: 2 } as const;
  const items = result.items
    .map(({ reportedResponses: _r, ...s }) => ({ ...s, hasForm: Boolean(s.formUrl), state: surveyState(s as Survey) }))
    .sort((a, b) => order[a.state] - order[b.state] || a.endDate.localeCompare(b.endDate));
  res.set('Cache-Control', 'no-store').json({ ...result, items });
});
