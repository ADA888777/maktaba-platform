import { SignJWT, jwtVerify } from 'jose';
import { config } from '../config.js';
import { usersRepo, type PublicUser, type User, type UserRole } from '../repositories/index.js';
import { hashPassword } from '../utils/password.js';

const key = new TextEncoder().encode(config.sessionSecret);
export const SESSION_COOKIE = 'lib_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

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
    const user = await usersRepo.get(Number(payload.sub));
    if (!user || !user.isActive || user.tokenVersion !== payload.v) return null;
    return user;
  } catch {
    return null;
  }
}

export const toPublicUser = ({ passwordHash: _p, tokenVersion: _t, ...rest }: User): PublicUser => rest;

/** Permissions per role */
export const PERMISSIONS = {
  admin: ['content', 'stats', 'loans', 'settings', 'users'],
  librarian: ['content', 'stats', 'loans'],
} as const satisfies Record<UserRole, readonly string[]>;
export type Permission = (typeof PERMISSIONS)['admin'][number];

export const can = (role: UserRole, permission: Permission) =>
  (PERMISSIONS[role] as readonly string[]).includes(permission);

/**
* Creates (or restores) the system administrator account from environment variables.
* ADMIN_PASSWORD is hashed with scrypt at boot and only the hash is stored.
* Set ADMIN_RESET_PASSWORD=true once to reset a forgotten password, then remove it.
*/
export async function bootstrapAdmin(): Promise<void> {
  const { username, displayName, passwordHash, password, resetPassword } = config.admin;
  if (!username) {
    console.warn('[auth] ADMIN_USERNAME is not set - no dashboard account can be created automatically.');
    return;
  }
  let hash = passwordHash;
  if (!hash && password) hash = await hashPassword(password);
  if (hash && !hash.startsWith('scrypt$')) {
    console.error('[auth] ADMIN_PASSWORD_HASH must be produced by: npm run hash-password --prefix server');
    return;
  }

const existing = await usersRepo.findByUsername(username);
  if (existing) {
    if (resetPassword && hash) {
      await usersRepo.update(existing.id, { passwordHash: hash, role: 'admin', isActive: true });
      console.log(`[auth] the password of "${username}" was reset from the environment variables.`);
    }
    return;
  }
  if (!hash) {
    console.warn('[auth] ADMIN_PASSWORD is not set, so no administrator account was created.');
    return;
  }
  await usersRepo.create({ username, displayName, passwordHash: hash, role: 'admin' });
  console.log(`[auth] administrator account "${username}" created.`);
}
