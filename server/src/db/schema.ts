import type { Pool } from 'pg';

/**
 * Database schema for PostgreSQL (Supabase).
 * Privacy note: no columns for personal trainee data (name, trainee id, email, phone).
 * Personal data goes straight to Microsoft Forms / Power Automate in the institution account.
 * Tables here hold public content and anonymous statistics only.
 * Every statement is idempotent so it can run safely on every boot.
 */
const migrations: string[] = [
    `
    create or replace function public.iso_now() returns text language sql stable as $iso$
select to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$iso$;

create table if not exists public.categories (
  id serial primary key,
    name text not null,
      kind text not null check (kind in ('book','resource','project')),
        created_at text not null default public.iso_now(),
          unique (name, kind)
          );

          create table if not exists public.books (
          id serial primary key,
          title text not null,
          author text not null default '',
          category_id integer references public.categories(id) on delete set null,
          specialty text not null default '',
          description text not null default '',
          cover_url text not null default '',
          publisher text not null default '',
          published_year integer,
          copies_total integer not null default 1 check (copies_total >= 0),
          copies_available integer not null default 1 check (copies_available >= 0),
          is_active integer not null default 1,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );
          create index if not exists idx_books_category on public.books(category_id);
          create index if not exists idx_books_active on public.books(is_active);
          create index if not exists idx_books_created on public.books(created_at);

          create table if not exists public.electronic_resources (
          id serial primary key,
          name text not null,
          description text not null default '',
          resource_type text not null default '',
          specialty text not null default '',
          category_id integer references public.categories(id) on delete set null,
          url text not null,
          icon text not null default 'globe',
          image_url text not null default '',
          is_active integer not null default 1,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );
          create index if not exists idx_resources_category on public.electronic_resources(category_id);
          create index if not exists idx_resources_active on public.electronic_resources(is_active);

          create table if not exists public.projects (
          id serial primary key,
          title text not null,
          team_name text not null default '',
          show_team integer not null default 0,
          specialty text not null default '',
          topic text not null default '',
          description text not null default '',
          project_date text,
          project_type text not null default '',
          category_id integer references public.categories(id) on delete set null,
          image_url text not null default '',
          file_url text not null default '',
          is_published integer not null default 1,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );
          create index if not exists idx_projects_date on public.projects(project_date);
          create index if not exists idx_projects_published on public.projects(is_published);

          create table if not exists public.events (
          id serial primary key,
          title text not null,
          description text not null default '',
          starts_at text not null,
          ends_at text,
          location text not null default '',
          department text not null default '',
          specialty text not null default '',
          image_url text not null default '',
          status text not null default 'scheduled' check (status in ('scheduled','postponed','cancelled')),
          is_published integer not null default 1,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );
          create index if not exists idx_events_starts on public.events(starts_at);

          create table if not exists public.surveys (
          id serial primary key,
          title text not null,
          description text not null default '',
          start_date text not null,
          end_date text not null,
          form_url text not null default '',
          reported_responses integer,
          is_published integer not null default 1,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );

          create table if not exists public.loans (
          id serial primary key,
          reference_code text not null unique,
          book_id integer references public.books(id) on delete set null,
          book_title text not null,
          specialty text not null default '',
          borrow_date text not null,
          expected_return_date text,
          status text not null default 'requested' check (status in ('requested','borrowed','returned','cancelled')),
          channel text not null default 'msforms' check (channel in ('msforms','flow','sink')),
          is_demo integer not null default 0,
          created_at text not null default public.iso_now(),
          updated_at text not null default public.iso_now()
          );
          create index if not exists idx_loans_created on public.loans(created_at);
          create index if not exists idx_loans_book on public.loans(book_id);
          create index if not exists idx_loans_status on public.loans(status);

          create table if not exists public.visit_responses (
          id serial primary key,
          has_visited integer not null,
          specialty text not null default '',
          reasons text not null default '[]',
          main_service text not null default '',
          visit_frequency text not null default '',
          is_demo integer not null default 0,
          created_at text not null default public.iso_now()
          );
          create index if not exists idx_visit_created on public.visit_responses(created_at);

          create table if not exists public.analytics_events (
          id bigserial primary key,
          event_type text not null,
          target_id integer,
          path text not null default '',
          visitor_hash text not null default '',
          day text not null,
          is_demo integer not null default 0,
          created_at text not null default public.iso_now()
          );
          create index if not exists idx_analytics_type_day on public.analytics_events(event_type, day);
          create index if not exists idx_analytics_target on public.analytics_events(event_type, target_id);

          create table if not exists public.settings (
          key text primary key,
          value text not null,
          updated_at text not null default public.iso_now()
          );

          create table if not exists public.users (
          id serial primary key,
          username text not null,
          display_name text not null,
          password_hash text not null,
          role text not null check (role in ('admin','librarian')),
          is_active integer not null default 1,
          token_version integer not null default 0,
          last_login_at text,
          created_at text not null default public.iso_now()
          );
          create unique index if not exists idx_users_username on public.users(lower(username));

          alter table public.categories enable row level security;
          alter table public.books enable row level security;
          alter table public.electronic_resources enable row level security;
          alter table public.projects enable row level security;
          alter table public.events enable row level security;
          alter table public.surveys enable row level security;
          alter table public.loans enable row level security;
          alter table public.visit_responses enable row level security;
          alter table public.analytics_events enable row level security;
          alter table public.settings enable row level security;
          alter table public.users enable row level security;
          `,
  ];

/** Applies pending migrations, each inside its own transaction. */
export async function migrate(pool: Pool): Promise<void> {
  await pool.query('create table if not exists public.schema_migrations (version integer primary key, applied_at text not null)');
  const { rows } = await pool.query<{ v: string | null }>('select max(version) as v from public.schema_migrations');
  const current = Number(rows[0]?.v ?? 0);
  for (let index = 0; index < migrations.length; index++) {
    const version = index + 1;
    if (version <= current) continue;
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(migrations[index]);
      await client.query('insert into public.schema_migrations (version, applied_at) values ($1, $2)', [version, new Date().toISOString()]);
      await client.query('commit');
      console.log('[db] applied migration ' + version);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  }
}
