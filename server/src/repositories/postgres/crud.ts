import { execute, query, queryOne } from '../../db/connection.js';
import type { CrudRepository, ListQuery, ListResult } from '../types.js';

type FieldKind = 'text' | 'int' | 'bool' | 'json';

export interface TableDefinition {
  table: string;
  /** code field name -> [column name, column kind] */
  fields: Record<string, [column: string, kind: FieldKind]>;
  searchable: string[];
  filterable: string[];
  sorts: Record<string, string>;
  defaultSort: string;
  /** publish or active column applied when publicOnly is set */
  publishColumn?: string;
  joinCategory?: boolean;
  timestamps?: boolean;
}

type Row = Record<string, unknown>;
type Param = string | number | null;

/** turns ? placeholders into the $1, $2 ... form PostgreSQL expects */
function pg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => '$' + ++i);
}

export function createCrudRepository<T, TInput>(def: TableDefinition): CrudRepository<T, TInput> {
  const t = def.table;
    const select = def.joinCategory
      ? `SELECT ${t}.*, c.name AS category_name FROM ${t} LEFT JOIN categories c ON c.id = ${t}.category_id`
      : `SELECT ${t}.* FROM ${t}`;

      const fromRow = (row: Row | null): T | null => {
        if (!row) return null;
          const out: Row = { id: Number(row.id) };
          for (const [key, [col, kind]] of Object.entries(def.fields)) {
                const v = row[col];
                if (kind === 'bool') out[key] = Number(v) === 1;
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
                          const values: Param[] = [];
                          for (const [key, value] of Object.entries(input)) {
                              const field = def.fields[key];
                                if (!field || value === undefined) continue;
                                const [col, kind] = field;
                                cols.push(col);
                                if (kind === 'bool') values.push(value ? 1 : 0);
                                else if (kind === 'json') values.push(JSON.stringify(value));
                                  else values.push(value as Param);
                                  }
                                    return { cols, values };
                                  };

                                    const buildWhere = (q: ListQuery) => {
                                      const clauses: string[] = [];
                                      const params: Param[] = [];
                                      if (q.publicOnly && def.publishColumn) clauses.push(`${t}.${def.publishColumn} = 1`);
                                          const search = q.search?.trim();
                                          if (search) {
                                            // wildcards are stripped so the term is always treated as plain text
                                            const like = '%' + search.replace(/[%_\\]/g, '') + '%';
                                            clauses.push('(' + def.searchable.map((f) => `${t}.${def.fields[f][0]} ILIKE ?`).join(' OR ') + ')');
                                                def.searchable.forEach(() => params.push(like));
                                                }
                                                  for (const [key, value] of Object.entries(q.filters ?? {})) {
                                                      if (value === undefined || value === '' || !def.filterable.includes(key)) continue;
                                                          const [col, kind] = def.fields[key];
                                                            clauses.push(`${t}.${col} = ?`);
                                                            params.push(kind === 'bool' ? (value === true || value === 'true' || value === 1 ? 1 : 0) : (value as Param));
                                                          }
                                                          if (q.where) {
                                                            clauses.push('(' + q.where.sql + ')');
                                                            params.push(...q.where.params);
                                                          }
                                                          return { sql: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '', params };
                                                            };

                                                              const repo: CrudRepository<T, TInput> = {
                                                                async list(q: ListQuery = {}): Promise<ListResult<T>> {
                                                                  const where = buildWhere(q);
                                                                  const pageSize = Math.min(Math.max(q.pageSize ?? 50, 1), 200);
                                                                  const page = Math.max(q.page ?? 1, 1);
                                                                  const order = (q.sort && def.sorts[q.sort]) || def.defaultSort;
                                                                      const totalRow = await queryOne<Row>(pg(`SELECT COUNT(*) AS n FROM ${t} ${where.sql}`), where.params);
                                                                      const rows = await query<Row>(pg(`${select} ${where.sql} ORDER BY ${order} LIMIT ? OFFSET ?`), [
                                                                          ...where.params,
                                                                          pageSize,
                                                                          (page - 1) * pageSize,
                                                                          ]);
                                                                      return { items: rows.map((r) => fromRow(r)!), total: Number(totalRow?.n ?? 0), page, pageSize };
                                                                    },

                                                                    async get(id: number): Promise<T | null> {
                                                                      return fromRow(await queryOne<Row>(pg(`${select} WHERE ${t}.id = ?`), [id]));
                                                                    },

                                                                    async create(input: TInput): Promise<T> {
                                                                      const { cols, values } = toParams(input as Record<string, unknown>);
                                                                      const inserted = await queryOne<Row>(
                                                                        pg(`INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING id`),
                                                                                  values,
                                                                                );
                                                                                  return (await repo.get(Number(inserted?.id)))!;
                                                                                },

                                                                                async update(id: number, input: Partial<TInput>): Promise<T | null> {
                                                                                  const { cols, values } = toParams(input as Record<string, unknown>);
                                                                                  if (cols.length) {
                                                                                      const stamp = def.timestamps === false ? '' : ', updated_at = public.iso_now()';
                                                                                        await execute(pg(`UPDATE ${t} SET ${cols.map((c) => c + ' = ?').join(', ')}${stamp} WHERE id = ?`), [...values, id]);
                                                                                            }
                                                                                            return repo.get(id);
                                                                                          },

                                                                                            async remove(id: number): Promise<boolean> {
                                                                                              return (await execute(pg(`DELETE FROM ${t} WHERE id = ?`), [id])) > 0;
                                                                                            },

                                                                                            async count(where: Record<string, string | number> = {}): Promise<number> {
                                                                                              const keys = Object.keys(where).filter((k) => def.fields[k]);
                                                                                                const sql = keys.length ? 'WHERE ' + keys.map((k) => `${def.fields[k][0]} = ?`).join(' AND ') : '';
                                                                                                    const row = await queryOne<Row>(pg(`SELECT COUNT(*) AS n FROM ${t} ${sql}`), keys.map((k) => where[k]));
                                                                                                    return Number(row?.n ?? 0);
                                                                                                  },
                                                                                                  };
                                                                                                    
                                                                                                    return repo;
                                                                                                  }
                                                                                                    
