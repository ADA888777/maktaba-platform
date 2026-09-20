import crypto from 'node:crypto';
import { execute, query, queryOne, transaction } from '../db/connection.js';
import { config } from '../config.js';

type Row = Record<string, unknown>;

/** Event types the public site is allowed to record */
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

/** The session id becomes a daily hash that cannot be linked across days nor reversed */
export function visitorHash(sessionId: string, day = todayKey()): string {
  return crypto.createHmac('sha256', config.analyticsSalt).update(`${day}:${sessionId}`).digest('hex').slice(0, 32);
}

export interface TrackInput {
  type: AnalyticsEventType;
  targetId?: number | null;
  path?: string;
  sessionId?: string;
  isDemo?: boolean;
  at?: Date;
}

export async function recordEvent(input: TrackInput): Promise<void> {
  const at = input.at ?? new Date();
  const day = todayKey(at);
  await execute(
    `INSERT INTO analytics_events (event_type, target_id, path, visitor_hash, day, is_demo, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.type,
      input.targetId ?? null,
      (input.path ?? '').slice(0, 120),
      input.sessionId ? visitorHash(input.sessionId, day) : '',
      day,
      input.isDemo ? 1 : 0,
      at.toISOString(),
      ],
    );
}

/** Fire and forget: recording usage must never block or break a visitor request */
export function trackEvent(input: TrackInput): void {
  void recordEvent(input).catch((e) => console.error('[analytics]', e instanceof Error ? e.message : e));
}

/* --------------------------- statistics --------------------------- */

const pgSql = (sql: string): string => {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
};

const n = async (sql: string, ...p: (string | number)[]): Promise<number> => {
  const row = await queryOne<Row>(pgSql(sql), p);
  return Number(row?.n ?? 0);
};

const rowsOf = (sql: string, ...p: (string | number)[]): Promise<Row[]> => query<Row>(pgSql(sql), p);

function sinceDay(days: number | null): string {
  if (!days) return '0000-00-00';
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return todayKey(d);
}

const countEvents = (type: string, since: string) =>
  n('SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = ? AND day >= ?', type, since);

const uniqueVisitors = (since: string) =>
  // unique visitors per day added up (the hash changes daily on purpose to protect privacy)
  n(
    `SELECT COUNT(*) AS n FROM (SELECT DISTINCT day, visitor_hash FROM analytics_events
    WHERE event_type = 'page_view' AND visitor_hash <> '' AND day >= ?) t`,
    since,
    );

async function daySeries(days: number, since: string) {
  const data = new Map<string, { views: number; visitors: number; resources: number; loans: number }>();
  const span = Math.min(days, 365);
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    data.set(todayKey(d), { views: 0, visitors: 0, resources: 0, loans: 0 });
  }
  for (const r of await rowsOf(
    `SELECT day, COUNT(*) AS views, COUNT(DISTINCT NULLIF(visitor_hash, '')) AS visitors
    FROM analytics_events WHERE event_type = 'page_view' AND day >= ? GROUP BY day`, since)) {
    const e = data.get(String(r.day));
    if (e) { e.views = Number(r.views); e.visitors = Number(r.visitors); }
  }
  for (const r of await rowsOf(
    `SELECT day, COUNT(*) AS c FROM analytics_events WHERE event_type IN ('resources_visit','resource_open') AND day >= ? GROUP BY day`, since)) {
    const e = data.get(String(r.day));
    if (e) e.resources = Number(r.c);
  }
  for (const r of await rowsOf(
    `SELECT substr(created_at,1,10) AS day, COUNT(*) AS c FROM loans WHERE status <> 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY substr(created_at,1,10)`, since)) {
    const e = data.get(String(r.day));
    if (e) e.loans = Number(r.c);
  }
  return [...data.entries()].map(([day, v]) => ({ day, ...v }));
}

async function monthSeries(since: string) {
  const rows = await rowsOf(
    `SELECT substr(day,1,7) AS month, COUNT(*) AS views, COUNT(DISTINCT day || visitor_hash) AS visitors
    FROM analytics_events WHERE event_type = 'page_view' AND day >= ? GROUP BY substr(day,1,7) ORDER BY 1`, since);
  return rows.map((r) => ({ month: String(r.month), views: Number(r.views), visitors: Number(r.visitors) }));
}

const labelled = (list: Row[]) => list.map((r) => ({ label: String(r.label || 'غير محدد'), value: Number(r.value) }));

export async function getDashboardStats(days: number | null) {
  const since = sinceDay(days);
  const nowIso = new Date().toISOString();
  const today = todayKey();

const overview = {
  visitors: await uniqueVisitors(since),
  pageViews: await countEvents('page_view', since),
  resourcesVisits: await countEvents('resources_visit', since),
  resourceOpens: await countEvents('resource_open', since),
  loans: await n(`SELECT COUNT(*) AS n FROM loans WHERE status <> 'cancelled' AND substr(created_at,1,10) >= ?`, since),
  borrowedCopies: await n('SELECT COALESCE(SUM(copies_total - copies_available),0) AS n FROM books'),
  projects: await n('SELECT COUNT(*) AS n FROM projects'),
  upcomingEvents: await n(`SELECT COUNT(*) AS n FROM events WHERE COALESCE(ends_at, starts_at) >= ? AND status <> 'cancelled'`, nowIso),
  surveyParticipations: await countEvents('survey_open', since),
  visitSurveyResponses: await n('SELECT COUNT(*) AS n FROM visit_responses WHERE substr(created_at,1,10) >= ?', since),
};

const resources = {
  visits: overview.resourcesVisits,
  opens: overview.resourceOpens,
  total: await n('SELECT COUNT(*) AS n FROM electronic_resources'),
  active: await n('SELECT COUNT(*) AS n FROM electronic_resources WHERE is_active = 1'),
  top: labelled(await rowsOf(
    `SELECT r.name AS label, COUNT(a.id) AS value FROM electronic_resources r
    JOIN analytics_events a ON a.target_id = r.id AND a.event_type = 'resource_open' AND a.day >= ?
    GROUP BY r.id, r.name ORDER BY value DESC LIMIT 10`, since)),
  byType: labelled(await rowsOf(
    `SELECT r.resource_type AS label, COUNT(a.id) AS value FROM electronic_resources r
    JOIN analytics_events a ON a.target_id = r.id AND a.event_type = 'resource_open' AND a.day >= ?
    GROUP BY r.resource_type ORDER BY value DESC`, since)),
};

const books = {
  total: await n('SELECT COUNT(*) AS n FROM books'),
  titlesAvailable: await n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1 AND copies_available > 0'),
  titlesUnavailable: await n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1 AND copies_available = 0'),
  copiesTotal: await n('SELECT COALESCE(SUM(copies_total),0) AS n FROM books'),
  copiesBorrowed: overview.borrowedCopies,
  visits: await countEvents('books_visit', since),
  topBorrowed: labelled(await rowsOf(
    `SELECT book_title AS label, COUNT(*) AS value FROM loans
    WHERE status <> 'cancelled' AND substr(created_at,1,10) >= ?
    GROUP BY book_title ORDER BY value DESC LIMIT 10`, since)),
  byCategory: labelled(await rowsOf(
    `SELECT COALESCE(c.name, 'بدون تصنيف') AS label, COUNT(*) AS value FROM books b
    LEFT JOIN categories c ON c.id = b.category_id GROUP BY COALESCE(c.name, 'بدون تصنيف') ORDER BY value DESC`)),
};

const loans = {
  total: overview.loans,
  starts: await countEvents('borrow_start', since),
  byStatus: labelled(await rowsOf(
    `SELECT status AS label, COUNT(*) AS value FROM loans WHERE substr(created_at,1,10) >= ? GROUP BY status`, since)),
  bySpecialty: labelled(await rowsOf(
    `SELECT specialty AS label, COUNT(*) AS value FROM loans
    WHERE status <> 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY specialty ORDER BY value DESC`, since)),
  byMonth: (await rowsOf(
    `SELECT substr(created_at,1,7) AS month, COUNT(*) AS value FROM loans
    WHERE status <> 'cancelled' AND substr(created_at,1,10) >= ? GROUP BY substr(created_at,1,7) ORDER BY 1`, since)
            ).map((r) => ({ month: String(r.month), value: Number(r.value) })),
  overdue: await n(
    `SELECT COUNT(*) AS n FROM loans WHERE status = 'borrowed' AND expected_return_date IS NOT NULL AND expected_return_date < ?`,
    today,
    ),
};

const projects = {
  total: overview.projects,
  upcomingEvents: overview.upcomingEvents,
  pastEvents: await n(`SELECT COUNT(*) AS n FROM events WHERE COALESCE(ends_at, starts_at) < ?`, nowIso),
  visits: await countEvents('projects_visit', since),
  eventsVisits: await countEvents('events_visit', since),
  bySpecialty: labelled(await rowsOf('SELECT specialty AS label, COUNT(*) AS value FROM projects GROUP BY specialty ORDER BY value DESC')),
  byType: labelled(await rowsOf('SELECT project_type AS label, COUNT(*) AS value FROM projects GROUP BY project_type ORDER BY value DESC')),
};

const surveys = {
  total: await n('SELECT COUNT(*) AS n FROM surveys'),
  active: await n('SELECT COUNT(*) AS n FROM surveys WHERE is_published = 1 AND start_date <= ? AND end_date >= ?', today, today),
  participations: overview.surveyParticipations,
  reportedResponses: await n('SELECT COALESCE(SUM(reported_responses),0) AS n FROM surveys'),
  visits: await countEvents('surveys_visit', since),
  bySurvey: (await rowsOf(
    `SELECT s.id, s.title AS label, s.reported_responses AS reported,
    (SELECT COUNT(*) FROM analytics_events a WHERE a.event_type = 'survey_open' AND a.target_id = s.id AND a.day >= ?) AS value
    FROM surveys s ORDER BY value DESC`, since)
             ).map((r) => ({ label: String(r.label), value: Number(r.value), reported: r.reported === null ? null : Number(r.reported) })),
};

const visitTotal = overview.visitSurveyResponses;
  const visited = await n('SELECT COUNT(*) AS n FROM visit_responses WHERE has_visited = 1 AND substr(created_at,1,10) >= ?', since);
  const reasonCounts = new Map<string, number>();
  for (const r of await rowsOf('SELECT reasons FROM visit_responses WHERE has_visited = 0 AND substr(created_at,1,10) >= ?', since)) {
    for (const reason of JSON.parse(String(r.reasons)) as string[]) reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const visit = {
    total: visitTotal,
    visited,
    notVisited: visitTotal - visited,
    visitedPct: visitTotal ? Math.round((visited / visitTotal) * 100) : 0,
    notVisitedPct: visitTotal ? 100 - Math.round((visited / visitTotal) * 100) : 0,
    pageVisits: await countEvents('visit_page', since),
    reasons: [...reasonCounts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    services: labelled(await rowsOf(
      `SELECT main_service AS label, COUNT(*) AS value FROM visit_responses
      WHERE main_service <> '' AND substr(created_at,1,10) >= ? GROUP BY main_service ORDER BY value DESC`, since)),
    bySpecialty: labelled(await rowsOf(
      `SELECT specialty AS label, COUNT(*) AS value FROM visit_responses WHERE substr(created_at,1,10) >= ?
      GROUP BY specialty ORDER BY value DESC`, since)),
  };

const seriesDays = Math.min(days ?? 365, 90);
  return {
    range: { days, since },
    overview,
    series: { daily: await daySeries(seriesDays, sinceDay(seriesDays)), monthly: await monthSeries(since) },
    resources,
    books,
    loans,
    projects,
    surveys,
    visit,
    demoData: {
      events: await n('SELECT COUNT(*) AS n FROM analytics_events WHERE is_demo = 1'),
      loans: await n('SELECT COUNT(*) AS n FROM loans WHERE is_demo = 1'),
      visitResponses: await n('SELECT COUNT(*) AS n FROM visit_responses WHERE is_demo = 1'),
    },
  };
}

export async function getPublicStats() {
  return {
    visitors: await uniqueVisitors('0000-00-00'),
    resources: await n('SELECT COUNT(*) AS n FROM electronic_resources WHERE is_active = 1'),
    books: await n('SELECT COUNT(*) AS n FROM books WHERE is_active = 1'),
    loans: await n(`SELECT COUNT(*) AS n FROM loans WHERE status <> 'cancelled'`),
    projects: await n('SELECT COUNT(*) AS n FROM projects WHERE is_published = 1'),
    surveyParticipations:
      (await n(`SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'survey_open'`)) +
      (await n('SELECT COUNT(*) AS n FROM visit_responses')),
  };
}

/** Removes anything flagged as demo data (kept for safety, the platform ships without demo data) */
export async function clearDemoData() {
  return transaction(async (client) => {
    // give borrowed demo copies back to the stock before deleting their records
                     await client.query(
                       `UPDATE books SET copies_available = LEAST(copies_total, copies_available +
                       (SELECT COUNT(*) FROM loans l WHERE l.is_demo = 1 AND l.status = 'borrowed' AND l.book_id = books.id))`,
                       );
    const a = await client.query('DELETE FROM analytics_events WHERE is_demo = 1');
    const l = await client.query('DELETE FROM loans WHERE is_demo = 1');
    const v = await client.query('DELETE FROM visit_responses WHERE is_demo = 1');
    return { events: a.rowCount ?? 0, loans: l.rowCount ?? 0, visitResponses: v.rowCount ?? 0 };
  });
}

export async function resetAllAnalytics(): Promise<number> {
  return execute('DELETE FROM analytics_events');
}
