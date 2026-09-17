import type { SQLInputValue } from 'node:sqlite';
import { getDb } from '../../db/connection.js';
import type { CrudRepository, ListQuery, ListResult } from '../types.js';

type FieldKind = 'text' | 'int' | 'bool' | 'json';

export interface TableDefinition {
  table: string;
  /** اسم الحقل في الكود ← [اسم العمود، نوعه] */
  fields: Record<string, [column: string, kind: FieldKind]>;
  searchable: string[];
  filterable: string[];
  sorts: Record<string, string>;
  defaultSort: string;
  /** عمود النشر/التفعيل الذي يُطبّق عند publicOnly */
  publishColumn?: string;
  joinCategory?: boolean;
  timestamps?: boolean;
}

type Row = Record<string, unknown>;

export function createCrudRepository<T, TInput>(def: TableDefinition): CrudRepository<T, TInput> {
  const db = () => getDb();
  const t = def.table;
  const select = def.joinCategory
    ? `SELECT ${t}.*, c.name AS category_name FROM ${t} LEFT JOIN categories c ON c.id = ${t}.category_id`
    : `SELECT ${t}.* FROM ${t}`;

  const fromRow = (row: Row | undefined): T | null => {
    if (!row) return null;
    const out: Row = { id: row.id };
    for (const [key, [col, kind]] of Object.entries(def.fields)) {
      const v = row[col];
      if (kind === 'bool') out[key] = v === 1 || v === 1n;
      else if (kind === 'json') out[key] = typeof v === 'string' ? JSON.parse(v) : [];
      else if (kind === 'int') out[key] = v === null || v === undefined ? null : Number(v);
      else out[key] = v ?? null;
    }
    if (def.joinCategory) out.categoryName = row.category_name ?? null;
    if ('created_at' in row) out.createdAt = row.created_at;
    if ('updated_at' in row) out.updatedAt = row.updated_at;
    return out as T;
  };

  const toParams = (input: Record<string, unknown>) => {
    const cols: string[] = [];
    const values: SQLInputValue[] = [];
    for (const [key, value] of Object.entries(input)) {
      const field = def.fields[key];
      if (!field || value === undefined) continue;
      const [col, kind] = field;
      cols.push(col);
      if (kind === 'bool') values.push(value ? 1 : 0);
      else if (kind === 'json') values.push(JSON.stringify(value));
      else values.push(value as SQLInputValue);
    }
    return { cols, values };
  };

  const buildWhere = (query: ListQuery) => {
    const clauses: string[] = [];
    const params: SQLInputValue[] = [];
    if (query.publicOnly && def.publishColumn) clauses.push(`${t}.${def.publishColumn} = 1`);
    const search = query.search?.trim();
    if (search) {
      const like = `%${search.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
      clauses.push(`(${def.searchable.map((f) => `${t}.${def.fields[f][0]} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
      def.searchable.forEach(() => params.push(like));
    }
    for (const [key, value] of Object.entries(query.filters ?? {})) {
      if (value === undefined || value === '' || !def.filterable.includes(key)) continue;
      const [col, kind] = def.fields[key];
      clauses.push(`${t}.${col} = ?`);
      params.push(kind === 'bool' ? (value === true || value === 'true' || value === 1 ? 1 : 0) : (value as SQLInputValue));
    }
    if (query.where) {
      clauses.push(`(${query.where.sql})`);
      params.push(...query.where.params);
    }
    return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  };

  return {
    list(query: ListQuery = {}): ListResult<T> {
      const where = buildWhere(query);
      const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 200);
      const page = Math.max(query.page ?? 1, 1);
      const order = (query.sort && def.sorts[query.sort]) || def.defaultSort;
      const total = Number(
        (db().prepare(`SELECT COUNT(*) AS n FROM ${t} ${where.sql}`).get(...where.params) as Row).n,
      );
      const rows = db()
        .prepare(`${select} ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`)
        .all(...where.params, pageSize, (page - 1) * pageSize) as Row[];
      return { items: rows.map((r) => fromRow(r)!) , total, page, pageSize };
    },

    get(id: number) {
      return fromRow(db().prepare(`${select} WHERE ${t}.id = ?`).get(id) as Row | undefined);
    },

    create(input: TInput) {
      const { cols, values } = toParams(input as Record<string, unknown>);
      const result = db()
        .prepare(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .run(...values);
      return this.get(Number(result.lastInsertRowid))!;
    },

    update(id: number, input: Partial<TInput>) {
      const { cols, values } = toParams(input as Record<string, unknown>);
      if (cols.length) {
        const stamp = def.timestamps === false ? '' : `, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
        db().prepare(`UPDATE ${t} SET ${cols.map((c) => `${c} = ?`).join(', ')}${stamp} WHERE id = ?`).run(...values, id);
      }
      return this.get(id);
    },

    remove(id: number) {
      return Number(db().prepare(`DELETE FROM ${t} WHERE id = ?`).run(id).changes) > 0;
    },

    count(where: Record<string, string | number> = {}) {
      const keys = Object.keys(where).filter((k) => def.fields[k]);
      const sql = keys.length ? `WHERE ${keys.map((k) => `${def.fields[k][0]} = ?`).join(' AND ')}` : '';
      return Number((db().prepare(`SELECT COUNT(*) AS n FROM ${t} ${sql}`).get(...keys.map((k) => where[k])) as Row).n);
    },
  };
}
