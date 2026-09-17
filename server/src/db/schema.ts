import type { DatabaseSync } from 'node:sqlite';

/**
 * مخطط قاعدة البيانات.
 * ملاحظة الخصوصية: لا توجد أي أعمدة لبيانات الطالبات الشخصية (الاسم، الرقم التدريبي،
 * البريد، الجوال). هذه البيانات تذهب مباشرة إلى Microsoft Forms / Power Automate
 * في حساب المؤسسة. الجداول هنا للمحتوى العام وللإحصائيات المجهولة فقط.
 */
const migrations: string[] = [
  /* 1 — الجداول الأساسية */ `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('book','resource','project')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (name, kind)
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    specialty TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    cover_url TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL DEFAULT '',
    published_year INTEGER,
    copies_total INTEGER NOT NULL DEFAULT 1 CHECK (copies_total >= 0),
    copies_available INTEGER NOT NULL DEFAULT 1 CHECK (copies_available >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS electronic_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    resource_type TEXT NOT NULL DEFAULT '',
    specialty TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'globe',
    image_url TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    team_name TEXT NOT NULL DEFAULT '',
    show_team INTEGER NOT NULL DEFAULT 0,
    specialty TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    project_date TEXT,
    project_type TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL DEFAULT '',
    file_url TEXT NOT NULL DEFAULT '',
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    location TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    specialty TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','postponed','cancelled')),
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_starts ON events(starts_at);

  CREATE TABLE IF NOT EXISTS surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    form_url TEXT NOT NULL DEFAULT '',
    reported_responses INTEGER,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- سجلات استعارة مجهولة الهوية: بدون اسم أو رقم تدريبي أو وسيلة تواصل
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_code TEXT NOT NULL UNIQUE,
    book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
    book_title TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    borrow_date TEXT NOT NULL,
    expected_return_date TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','borrowed','returned','cancelled')),
    channel TEXT NOT NULL DEFAULT 'msforms' CHECK (channel IN ('msforms','flow','sink')),
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_loans_created ON loans(created_at);
  CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_id);

  -- إجابات استطلاع زيارة المكتبة (الجزء غير الشخصي فقط)
  CREATE TABLE IF NOT EXISTS visit_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    has_visited INTEGER NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    reasons TEXT NOT NULL DEFAULT '[]',
    main_service TEXT NOT NULL DEFAULT '',
    visit_frequency TEXT NOT NULL DEFAULT '',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- الإحصائيات: أحداث مجهولة. visitor_hash يُشتق من معرّف جلسة عشوائي + ملح يومي
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    target_id INTEGER,
    path TEXT NOT NULL DEFAULT '',
    visitor_hash TEXT NOT NULL DEFAULT '',
    day TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_analytics_type_day ON analytics_events(event_type, day);
  CREATE INDEX IF NOT EXISTS idx_analytics_target ON analytics_events(event_type, target_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','librarian')),
    is_active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 0,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  `,
];

export function migrate(db: DatabaseSync) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number | null };
  const current = row?.v ?? 0;
  migrations.forEach((sql, index) => {
    const version = index + 1;
    if (version <= current) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
}
