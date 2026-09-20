import { execute, query, queryOne } from '../../db/connection.js';
import type { Category, CategoryKind, User, UserRole, VisitResponse } from '../types.js';

type Row = Record<string, unknown>;

const toCategory = (r: Row): Category => ({ id: Number(r.id), name: String(r.name), kind: r.kind as CategoryKind });

/* ---------- categories ---------- */
export const categoriesRepo = {
async list(kind?: CategoryKind): Promise<(Category & { usage: number })[]> {
const rows = await query<Row>(
`SELECT c.id, c.name, c.kind,
(SELECT COUNT(*) FROM books b WHERE b.category_id = c.id) +
(SELECT COUNT(*) FROM electronic_resources r WHERE r.category_id = c.id) +
(SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) AS usage_count
FROM categories c ${kind ? 'WHERE c.kind = $1' : ''} ORDER BY c.name`,
kind ? [kind] : [],
);
return rows.map((r) => ({ ...toCategory(r), usage: Number(r.usage_count) }));
},

async get(id: number): Promise<Category | null> {
const r = await queryOne<Row>('SELECT id, name, kind FROM categories WHERE id = $1', [id]);
return r ? toCategory(r) : null;
},

async create(name: string, kind: CategoryKind): Promise<Category> {
const r = await queryOne<Row>('INSERT INTO categories (name, kind) VALUES ($1, $2) RETURNING id, name, kind', [name, kind]);
return toCategory(r!);
},

async rename(id: number, name: string): Promise<Category | null> {
await execute('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
return categoriesRepo.get(id);
},

async remove(id: number): Promise<boolean> {
return (await execute('DELETE FROM categories WHERE id = $1', [id])) > 0;
},
};

/* ---------- settings (JSON values) ---------- */
export const settingsRepo = {
async get<T>(key: string): Promise<T | undefined> {
const r = await queryOne<Row>('SELECT value FROM settings WHERE key = $1', [key]);
return r ? (JSON.parse(String(r.value)) as T) : undefined;
},

async set(key: string, value: unknown): Promise<void> {
await execute(
`INSERT INTO settings (key, value) VALUES ($1, $2)
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = public.iso_now()`,
[key, JSON.stringify(value)],
);
},
};

/* ---------- users ---------- */
const toUser = (r: Row | null): User | null =>
r
? {
id: Number(r.id),
username: String(r.username),
displayName: String(r.display_name),
passwordHash: String(r.password_hash),
role: r.role as UserRole,
isActive: Number(r.is_active) === 1,
tokenVersion: Number(r.token_version),
lastLoginAt: (r.last_login_at as string) ?? null,
createdAt: String(r.created_at),
}
: null;

export const usersRepo = {
async count(): Promise<number> {
const r = await queryOne<Row>('SELECT COUNT(*) AS n FROM users');
return Number(r?.n ?? 0);
},

async countActiveAdmins(excludeId?: number): Promise<number> {
const r = await queryOne<Row>(
"SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1 AND id <> $1",
[excludeId ?? 0],
);
return Number(r?.n ?? 0);
},

async list(): Promise<User[]> {
const rows = await query<Row>('SELECT * FROM users ORDER BY created_at');
return rows.map((r) => toUser(r)!);
},

async get(id: number): Promise<User | null> {
return toUser(await queryOne<Row>('SELECT * FROM users WHERE id = $1', [id]));
},

async findByUsername(username: string): Promise<User | null> {
return toUser(await queryOne<Row>('SELECT * FROM users WHERE lower(username) = lower($1)', [username]));
},

async create(input: { username: string; displayName: string; passwordHash: string; role: UserRole }): Promise<User> {
const r = await queryOne<Row>(
'INSERT INTO users (username, display_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
[input.username, input.displayName, input.passwordHash, input.role],
);
return toUser(r)!;
},

async update(
id: number,
input: Partial<{ displayName: string; role: UserRole; isActive: boolean; passwordHash: string }>,
): Promise<User | null> {
const sets: string[] = [];
const vals: (string | number)[] = [];
const next = () => '$' + (vals.length + 1);
if (input.displayName !== undefined) { sets.push('display_name = ' + next()); vals.push(input.displayName); }
if (input.role !== undefined) { sets.push('role = ' + next()); vals.push(input.role); }
if (input.isActive !== undefined) { sets.push('is_active = ' + next()); vals.push(input.isActive ? 1 : 0); }
if (input.passwordHash !== undefined) { sets.push('password_hash = ' + next()); vals.push(input.passwordHash); }
// any change to role, status or password invalidates existing sessions
if (input.role !== undefined || input.isActive !== undefined || input.passwordHash !== undefined) {
sets.push('token_version = token_version + 1');
}
if (sets.length) {
await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length + 1}`, [...vals, id]);
}
return usersRepo.get(id);
},

async touchLogin(id: number): Promise<void> {
await execute('UPDATE users SET last_login_at = public.iso_now() WHERE id = $1', [id]);
},

async remove(id: number): Promise<boolean> {
return (await execute('DELETE FROM users WHERE id = $1', [id])) > 0;
},
};

/* ---------- library visit survey (anonymous) ---------- */
export const visitResponsesRepo = {
async create(input: Omit<VisitResponse, 'id' | 'createdAt'> & { isDemo?: boolean; createdAt?: string }): Promise<number> {
const r = await queryOne<Row>(
`INSERT INTO visit_responses (has_visited, specialty, reasons, main_service, visit_frequency, is_demo, created_at)
VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::text, public.iso_now())) RETURNING id`,
[
input.hasVisited ? 1 : 0,
input.specialty,
JSON.stringify(input.reasons),
input.mainService,
input.visitFrequency,
input.isDemo ? 1 : 0,
input.createdAt ?? null,
],
);
return Number(r?.id ?? 0);
},

async list(limit = 100, offset = 0): Promise<{ items: VisitResponse[]; total: number }> {
const totalRow = await queryOne<Row>('SELECT COUNT(*) AS n FROM visit_responses');
const rows = await query<Row>('SELECT * FROM visit_responses ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
return {
total: Number(totalRow?.n ?? 0),
items: rows.map((r) => ({
id: Number(r.id),
hasVisited: Number(r.has_visited) === 1,
specialty: String(r.specialty),
reasons: JSON.parse(String(r.reasons)),
mainService: String(r.main_service),
visitFrequency: String(r.visit_frequency),
createdAt: String(r.created_at),
})),
};
},
};
