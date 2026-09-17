import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

/** صيغة التخزين: scrypt$N$r$p$saltBase64$hashBase64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return 'يجب ألا تقل كلمة المرور عن 10 أحرف';
  if (!/[A-Za-z؀-ۿ]/.test(password) || !/\d/.test(password)) {
    return 'يجب أن تحتوي كلمة المرور على حروف وأرقام';
  }
  return null;
}
