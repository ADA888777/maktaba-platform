import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './schema.js';

let db: DatabaseSync | null = null;

export function openDatabase(file: string): DatabaseSync {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const instance = new DatabaseSync(file);
  instance.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(instance);
  return instance;
}

export function initDatabase(file: string): DatabaseSync {
  db = openDatabase(file);
  return db;
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error('قاعدة البيانات غير مهيأة');
  return db;
}

/** تنفيذ مجموعة عمليات كوحدة واحدة */
export function transaction<T>(fn: () => T): T {
  const d = getDb();
  d.exec('BEGIN');
  try {
    const result = fn();
    d.exec('COMMIT');
    return result;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}
