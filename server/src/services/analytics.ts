import crypto from 'node:crypto';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';

type Row = Record<string, unknown>;
const db = () => getDb();

/** أنواع الأحداث المسموح تسجيلها من الواجهة العامة */
export const PUBLIC_EVENT_TYPES = [
  'page_view',
  'resources_visit',
  'resource_open',
  'books_visit',
  'borrow_start',
  'projects_visit',
  'events_visit',
  'surveys_visit',
  'survey_open',
  'visit_page',
] as const;
export type AnalyticsEventType = (typeof PUBLIC_EVENT_TYPES)[number] | 'borrow_submitted' | 'visit_survey_submitted';

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** معرّف الجلسة يُحوَّل لتجزئة يومية لا يمكن ربطها بين الأيام ولا عكسها */
export function visitorHash(sessionId: string, day = todayKey()): string {
  return crypto.createHmac('sha256', config.analyticsSalt).update(`${day}:${sessionId}`).digest('hex').slice(0, 32);
}

export function trackEvent(input: {
  type: AnalyticsEventType;
  targetId?: number | null;
  path?: string;
  sessionId?: string;
  isDemo?: boolean;
  at?: Date;
}) {
  const at = input.at ?? new Date();
  const day = todayKey(at);
  db()
    .prepare(
      `INSERT INTO analytics_events (event_type, target_id, path, visitor_hash, day, is_demo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.type,
      input.targetId ?? null,
      (input.path ?? '').slice(0, 120),
      input.sessionId ? visitorHash(input.sessionId, day) : '',
      day,
      input.isDemo ? 1 : 0,
      at.toISOString(),
    );
}

/* ───────────────────────── الإحصائيات ───────────────────────── */

const n = (sql: string, ...p: (string | number)[]) => Number((db().prepare(sql).get(...p) as Row)?.n ?? 0);
const rows = (sql: string, ...p: (string | number)[]) => db().prepare(sql).all(...p) as Row[];

function sinceDay(days: number | null): string {
  if (!days) return '0000-00-00';
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return todayKey(d);
}

function countEvents(type: string, since: string) {
  return n('SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = ? AND day >= ?', type, since);
}

function uniqueVisitors(since: string) {
  // مجموع الزوار الفريدين لكل يوم (التجزئة تتغير يوميًا عمدًا لحماية الخصوصية)
  return n(
    `SELECT COUNT(*) AS n FROM (SELECT DISTINCT day, visitor_hash FROM analytics_events
     WHERE event_type = 'page_view' AND visitor_hash != '' AND day >= ?)`,
    since,
  );
}

function daySeries(days: number, since: string) {
  const data = new Map<string, { views: number; visitors: number; resources: number; loans: number }>();
  const span = Math.min(days, 365);
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    data.set(todayKey(d), { views: 0, visitors: 0, resources: 0, loans: 0 });
  }
  for (const r of rows(
    `SELECT day, COUNT(*) AS views, COUNT(DISTINCT NULLIF(visitor_hash, '')) AS visitors
     FROM analytics_events WHERE event_type = 'page_view' AND day >= ? GROUP BY day`, since)) {
    const e = data.get(String(r.day));
    if (e) { e.views = Number(r.views); e.visitors = Number(r.visitors); }
  }
  for (const r of rows(
    `SELECT day, COUNT(*) AS c FROM analytics_events WHERE event_type IN ('resources_visit','resource_open') AND day >= ? GROUP BY day`, since)) {
    const e = data.get(String(r.day));
    if (e) e.resources = Number(r.c);
  }
  for (const r of rows(
    `SELECT substr(created_at,1,10) AS day, COUNT(*) AS c FROM loans WHERE status != 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY day`, since)) {
    const e = data.get(String(r.day));
    if (e) e.loans = Number(r.c);
  }
  return [...data.entries()].map(([day, v]) => ({ day, ...v }));
}

function monthSeries(since: string) {
  return rows(
    `SELECT substr(day,1,7) AS month, COUNT(*) AS views, COUNT(DISTINCT day || visitor_hash) AS visitors
     FROM analytics_events WHERE event_type = 'page_view' AND day >= ? GROUP BY month ORDER BY month`, since,
  ).map((r) => ({ month: String(r.month), views: Number(r.views), visitors: Number(r.visitors) }));
}

const labelled = (list: Row[]) => list.map((r) => ({ label: String(r.label || 'غير محدد'), value: Number(r.value) }));

export function getDashboardStats(days: number | null) {
  const since = sinceDay(days);
  const nowIso = new Date().toISOString();

  const overview = {
    visitors: uniqueVisitors(since),
    pageViews: countEvents('page_view', since),
    resourcesVisits: countEvents('resources_visit', since),
    resourceOpens: countEvents('resource_open', since),
    loans: n(`SELECT COUNT(*) AS n FROM loans WHERE status != 'cancelled' AND substr(created_at,1,10) >= ?`, since),
    borrowedCopies: n(`SELECT COALESCE(SUM(copies_total - copies_available),0) AS n FROM books`),
    projects: n('SELECT COUNT(*) AS n FROM projects'),
    upcomingEvents: n(`SELECT COUNT(*) AS n FROM events WHERE COALESCE(ends_at, starts_at) >= ? AND status != 'cancelled'`, nowIso),
    surveyParticipations: countEvents('survey_open', since),
    visitSurveyResponses: n('SELECT COUNT(*) AS n FROM visit_responses WHERE substr(created_at,1,10) >= ?', since),
  };

  const resources = {
    visits: overview.resourcesVisits,
    opens: overview.resourceOpens,
    total: n('SELECT COUNT(*) AS n FROM electronic_resources'),
    active: n('SELECT COUNT(*) AS n FROM electronic_resources WHERE is_active = 1'),
    top: labelled(rows(
      `SELECT r.name AS label, COUNT(a.id) AS value FROM electronic_resources r
       JOIN analytics_events a ON a.target_id = r.id AND a.event_type = 'resource_open' AND a.day >= ?
       GROUP BY r.id ORDER BY value DESC LIMIT 10`, since)),
    byType: labelled(rows(
      `SELECT r.resource_type AS label, COUNT(a.id) AS value FROM electronic_resources r
       JOIN analytics_events a ON a.target_id = r.id AND a.event_type = 'resource_open' AND a.day >= ?
       GROUP BY r.resource_type ORDER BY value DESC`, since)),
  };

  const books = {
    total: n('SELECT COUNT(*) AS n FROM books'),
    titlesAvailable: n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1 AND copies_available > 0'),
    titlesUnavailable: n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1 AND copies_available = 0'),
    copiesTotal: n('SELECT COALESCE(SUM(copies_total),0) AS n FROM books'),
    copiesBorrowed: overview.borrowedCopies,
    visits: countEvents('books_visit', since),
    topBorrowed: labelled(rows(
      `SELECT book_title AS label, COUNT(*) AS value FROM loans
       WHERE status != 'cancelled' AND substr(created_at,1,10) >= ?
       GROUP BY COALESCE(book_id, book_title) ORDER BY value DESC LIMIT 10`, since)),
    byCategory: labelled(rows(
      `SELECT COALESCE(c.name, 'بدون تصنيف') AS label, COUNT(*) AS value FROM books b
       LEFT JOIN categories c ON c.id = b.category_id GROUP BY label ORDER BY value DESC`)),
  };

  const loans = {
    total: overview.loans,
    starts: countEvents('borrow_start', since),
    byStatus: labelled(rows(
      `SELECT status AS label, COUNT(*) AS value FROM loans WHERE substr(created_at,1,10) >= ? GROUP BY status`, since)),
    bySpecialty: labelled(rows(
      `SELECT specialty AS label, COUNT(*) AS value FROM loans
       WHERE status != 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY specialty ORDER BY value DESC`, since)),
    byMonth: rows(
      `SELECT substr(created_at,1,7) AS month, COUNT(*) AS value FROM loans
       WHERE status != 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY month ORDER BY month`, since,
    ).map((r) => ({ month: String(r.month), value: Number(r.value) })),
    overdue: n(
      `SELECT COUNT(*) AS n FROM loans WHERE status = 'borrowed' AND expected_return_date IS NOT NULL AND expected_return_date < ?`,
      todayKey(),
    ),
  };

  const projects = {
    total: overview.projects,
    upcomingEvents: overview.upcomingEvents,
    pastEvents: n(`SELECT COUNT(*) AS n FROM events WHERE COALESCE(ends_at, starts_at) < ?`, nowIso),
    visits: countEvents('projects_visit', since),
    eventsVisits: countEvents('events_visit', since),
    bySpecialty: labelled(rows(`SELECT specialty AS label, COUNT(*) AS value FROM projects GROUP BY specialty ORDER BY value DESC`)),
    byType: labelled(rows(`SELECT project_type AS label, COUNT(*) AS value FROM projects GROUP BY project_type ORDER BY value DESC`)),
  };

  const surveys = {
    total: n('SELECT COUNT(*) AS n FROM surveys'),
    active: n(`SELECT COUNT(*) AS n FROM surveys WHERE is_published = 1 AND start_date <= ? AND end_date >= ?`, todayKey(), todayKey()),
    participations: overview.surveyParticipations,
    reportedResponses: n('SELECT COALESCE(SUM(reported_responses),0) AS n FROM surveys'),
    visits: countEvents('surveys_visit', since),
    bySurvey: rows(
      `SELECT s.id, s.title AS label, s.reported_responses AS reported,
        (SELECT COUNT(*) FROM analytics_events a WHERE a.event_type = 'survey_open' AND a.target_id = s.id AND a.day >= ?) AS value
       FROM surveys s ORDER BY value DESC`, since,
    ).map((r) => ({ label: String(r.label), value: Number(r.value), reported: r.reported === null ? null : Number(r.reported) })),
  };

  const visitTotal = overview.visitSurveyResponses;
  const visited = n('SELECT COUNT(*) AS n FROM visit_responses WHERE has_visited = 1 AND substr(created_at,1,10) >= ?', since);
  const reasonCounts = new Map<string, number>();
  for (const r of rows(`SELECT reasons FROM visit_responses WHERE has_visited = 0 AND substr(created_at,1,10) >= ?`, since)) {
    for (const reason of JSON.parse(String(r.reasons)) as string[]) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const visit = {
    total: visitTotal,
    visited,
    notVisited: visitTotal - visited,
    visitedPct: visitTotal ? Math.round((visited / visitTotal) * 100) : 0,
    notVisitedPct: visitTotal ? 100 - Math.round((visited / visitTotal) * 100) : 0,
    pageVisits: countEvents('visit_page', since),
    reasons: [...reasonCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    services: labelled(rows(
      `SELECT main_service AS label, COUNT(*) AS value FROM visit_responses
       WHERE main_service != '' AND substr(created_at,1,10) >= ? GROUP BY main_service ORDER BY value DESC`, since)),
    bySpecialty: labelled(rows(
      `SELECT specialty AS label, COUNT(*) AS value FROM visit_responses WHERE substr(created_at,1,10) >= ?
       GROUP BY specialty ORDER BY value DESC`, since)),
  };

  const seriesDays = days ?? 365;
  return {
    range: { days, since },
    overview,
    series: { daily: daySeries(Math.min(seriesDays, 90), sinceDay(Math.min(seriesDays, 90))), monthly: monthSeries(since) },
    resources,
    books,
    loans,
    projects,
    surveys,
    visit,
    demoData: {
      events: n('SELECT COUNT(*) AS n FROM analytics_events WHERE is_demo = 1'),
      loans: n('SELECT COUNT(*) AS n FROM loans WHERE is_demo = 1'),
      visitResponses: n('SELECT COUNT(*) AS n FROM visit_responses WHERE is_demo = 1'),
    },
  };
}

export function getPublicStats() {
  return {
    visitors: uniqueVisitors('0000-00-00'),
    resources: n('SELECT COUNT(*) AS n FROM electronic_resources WHERE is_active = 1'),
    books: n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1'),
    loans: n(`SELECT COUNT(*) AS n FROM loans WHERE status != 'cancelled'`),
    projects: n('SELECT COUNT(*) AS n FROM projects WHERE is_published = 1'),
    surveyParticipations: n(`SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'survey_open'`) +
      n('SELECT COUNT(*) AS n FROM visit_responses'),
  };
}

export function clearDemoData() {
  const d = db();
  d.exec('BEGIN');
  try {
    // إعادة النسخ المستعارة تجريبيًا إلى الرصيد قبل حذف سجلاتها
    d.prepare(
      `UPDATE books SET copies_available = MIN(copies_total, copies_available +
        (SELECT COUNT(*) FROM loans l WHERE l.is_demo = 1 AND l.status = 'borrowed' AND l.book_id = books.id))`,
    ).run();
    const a = Number(d.prepare('DELETE FROM analytics_events WHERE is_demo = 1').run().changes);
    const l = Number(d.prepare('DELETE FROM loans WHERE is_demo = 1').run().changes);
    const v = Number(d.prepare('DELETE FROM visit_responses WHERE is_demo = 1').run().changes);
    d.exec('COMMIT');
    return { events: a, loans: l, visitResponses: v };
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

export function resetAllAnalytics() {
  return Number(db().prepare('DELETE FROM analytics_events').run().changes);
}
