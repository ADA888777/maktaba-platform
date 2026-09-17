import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import { usersRepo, type PublicUser, type User, type UserRole } from '../repositories/index.js';

const key = new TextEncoder().encode(config.sessionSecret);
export const SESSION_COOKIE = 'lib_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 ساعات

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ role: user.role, v: user.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const user = usersRepo.get(Number(payload.sub));
    if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
    return user;
  } catch {
    return null;
  }
}

export const toPublicUser = ({ passwordHash: _p, tokenVersion: _t, ...rest }: User): PublicUser => rest;

/** الصلاحيات حسب الدور */
export const PERMISSIONS = {
  admin: ['content', 'stats', 'loans', 'settings', 'users'],
  librarian: ['content', 'stats', 'loans'],
} as const satisfies Record<UserRole, readonly string[]>;
export type Permission = (typeof PERMISSIONS)['admin'][number];

export const can = (role: UserRole, permission: Permission) =>
  (PERMISSIONS[role] as readonly string[]).includes(permission);

/** إنشاء حساب المسؤولة الأولى من متغيرات البيئة عند أول تشغيل فقط */
export function bootstrapAdmin() {
  if (usersRepo.count() > 0) return;
  const { username, displayName, passwordHash } = config.admin;
  if (!username || !passwordHash) {
    console.warn(
      '[auth] لا يوجد أي حساب للوحة التحكم. اضبطي ADMIN_USERNAME و ADMIN_PASSWORD_HASH في ملف .env ثم أعيدي التشغيل،\n' +
        '       أو استخدمي: npm run create-admin --prefix server',
    );
    return;
  }
  if (!passwordHash.startsWith('scrypt$')) {
    console.error('[auth] ADMIN_PASSWORD_HASH يجب أن يكون تجزئة ناتجة عن: npm run hash-password --prefix server');
    return;
  }
  usersRepo.create({ username, displayName, passwordHash, role: 'admin' });
  console.log(`[auth] تم إنشاء حساب المسؤولة "${username}".`);
}
