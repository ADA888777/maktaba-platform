import type { NextFunction, Request, Response } from 'express';
import { can, SESSION_COOKIE, verifySessionToken, type Permission } from '../services/auth.js';
import type { User } from '../repositories/index.js';
import { HttpError } from '../utils/http.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  const user = token ? await verifySessionToken(token) : null;
  if (!user) return next(new HttpError(401, 'يجب تسجيل الدخول للوصول إلى لوحة التحكم'));
  req.user = user;
  next();
}

export const requirePermission = (permission: Permission) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !can(req.user.role, permission)) {
    return next(new HttpError(403, 'ليست لديك صلاحية لتنفيذ هذا الإجراء'));
  }
  next();
};

/**
 * حماية إضافية من CSRF: الطلبات المعدِّلة يجب أن تحمل ترويسة مخصصة
 * لا يمكن لمواقع أخرى إرسالها دون موافقة CORS (إضافة إلى SameSite=Strict).
 */
export function requireClientHeader(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Library-Client') !== '1') return next(new HttpError(403, 'طلب غير مسموح'));
  next();
}
