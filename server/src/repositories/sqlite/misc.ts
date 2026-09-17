import { getDb } from '../../db/connection.js';
import type { Category, CategoryKind, User, UserRole, VisitResponse } from '../types.js';

type Row = Record<string, unknown>;
const db = () => getDb();

/* ───────── التصنيفات ───────── */
export const categoriesRepo = {
  list(kind?: CategoryKind): (Category & { usage: number })[] {
    const rows = db()
      .prepare(
        `SELECT c.id, c.name, c.kind,
          (SELECT COUNT(*) FROM books b WHERE b.category_id = c.id) +
          (SELECT COUNT(*) FROM electronic_resources r WHERE r.category_id = c.id) +
          (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) AS usage
         FROM categories c ${kind ? 'WHERE c.kind = ?' : ''} ORDER BY c.name`,
      )
      .all(...(kind ? [kind] : [])) as Row[];
    return rows.map((r) => ({ id: Number(r.id), name: String(r.name), kind: r.kind as CategoryKind, usage: Number(r.usage) }));
  },
  get(id: number): Category | null {
    const r = db().prepare('SELECT id, name, kind FROM categories WHERE id = ?').get(id) as Row | undefined;
    return r ? { id: Number(r.id), name: String(r.name), kind: r.kind as CategoryKind } : null;
  },
  create(name: string, kind: CategoryKind): Category {
    const res = db().prepare('INSERT INTO categories (name, kind) VALUES (?, ?)').run(name, kind);
    return this.get(Number(res.lastInsertRowid))!;
  },
  rename(id: number, name: string) {
    db().prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
    return this.get(id);
  },
  remove(id: number) {
    return Number(db().prepare('DELETE FROM categories WHERE id = ?').run(id).changes) > 0;
  },
};

/* ───────── الإعدادات (قيم JSON) ───────── */
export const settingsRepo = {
  get<T>(key: string): T | undefined {
    const r = db().prepare('SELECT value FROM settings WHERE key = ?').get(key) as Row | undefined;
    return r ? (JSON.parse(String(r.value)) as T) : undefined;
  },
  set(key: string, value: unknown) {
    db()
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      )
      .run(key, JSON.stringify(value));
  },
};

/* ───────── المستخدمون ───────── */
const toUser = (r: Row | undefined): User | null =>
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
  count() {
    return Number((db().prepare('SELECT COUNT(*) AS n FROM users').get() as Row).n);
  },
  countActiveAdmins(excludeId?: number) {
    return Number(
      (db()
        .prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?`)
        .get(excludeId ?? 0) as Row).n,
    );
  },
  list(): User[] {
    return (db().prepare('SELECT * FROM users ORDER BY created_at').all() as Row[]).map((r) => toUser(r)!);
  },
  get(id: number) {
    return toUser(db().prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined);
  },
  findByUsername(username: string) {
    return toUser(db().prepare('SELECT * FROM users WHERE username = ?').get(username) as Row | undefined);
  },
  create(input: { username: string; displayName: string; passwordHash: string; role: UserRole }) {
    const res = db()
      .prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(input.username, input.displayName, input.passwordHash, input.role);
    return this.get(Number(res.lastInsertRowid))!;
  },
  update(id: number, input: Partial<{ displayName: string; role: UserRole; isActive: boolean; passwordHash: string }>) {
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (input.displayName !== undefined) { sets.push('display_name = ?'); vals.push(input.displayName); }
    if (input.role !== undefined) { sets.push('role = ?'); vals.push(input.role); }
    if (input.isActive !== undefined) { sets.push('is_active = ?'); vals.push(input.isActive ? 1 : 0); }
    if (input.passwordHash !== undefined) { sets.push('password_hash = ?'); vals.push(input.passwordHash); }
    // أي تغيير في الصلاحية أو كلمة المرور يُبطل الجلسات السابقة
    if (input.role !== undefined || input.isActive !== undefined || input.passwordHash !== undefined) {
      sets.push('token_version = token_version + 1');
    }
    if (sets.length) db().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    return this.get(id);
  },
  touchLogin(id: number) {
    db().prepare(`UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(id);
  },
  remove(id: number) {
    return Number(db().prepare('DELETE FROM users WHERE id = ?').run(id).changes) > 0;
  },
};

/* ───────── استطلاع زيارة المكتبة (مجهول) ───────── */
export const visitResponsesRepo = {
  create(input: Omit<VisitResponse, 'id' | 'createdAt'> & { isDemo?: boolean; createdAt?: string }) {
    const res = db()
      .prepare(
        `INSERT INTO visit_responses (has_visited, specialty, reasons, main_service, visit_frequency, is_demo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
      )
      .run(
        input.hasVisited ? 1 : 0,
        input.specialty,
        JSON.stringify(input.reasons),
        input.mainService,
        input.visitFrequency,
        input.isDemo ? 1 : 0,
        input.createdAt ?? null,
      );
    return Number(res.lastInsertRowid);
  },
  list(limit = 100, offset = 0): { items: VisitResponse[]; total: number } {
    const total = Number((db().prepare('SELECT COUNT(*) AS n FROM visit_responses').get() as Row).n);
    const rows = db()
      .prepare('SELECT * FROM visit_responses ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Row[];
    return {
      total,
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
