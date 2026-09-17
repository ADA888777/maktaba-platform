/** إنشاء حساب مسؤولة من الطرفية: npm run create-admin --prefix server */
import readline from 'node:readline/promises';
import { config } from '../config.js';
import { initDatabase } from '../db/connection.js';
import { usersRepo } from '../repositories/index.js';
import { hashPassword, validatePasswordStrength } from '../utils/password.js';

initDatabase(config.databasePath);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const username = (await rl.question('اسم المستخدم (بالإنجليزية): ')).trim();
const displayName = (await rl.question('الاسم الظاهر: ')).trim() || 'مسؤولة المكتبة';
const password = process.env.PASSWORD ?? (await rl.question('كلمة المرور: '));
rl.close();

if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
  console.error('اسم المستخدم غير صالح');
  process.exit(1);
}
const weak = validatePasswordStrength(password);
if (weak) {
  console.error(weak);
  process.exit(1);
}
if (usersRepo.findByUsername(username)) {
  console.error('اسم المستخدم موجود مسبقًا');
  process.exit(1);
}
usersRepo.create({ username, displayName, role: 'admin', passwordHash: await hashPassword(password) });
console.log(`تم إنشاء الحساب "${username}" بصلاحية مسؤولة.`);
