import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { usersRepo } from '../repositories/index.js';
import { loginSchema } from '../schemas.js';
import {
  createSessionToken, PERMISSIONS, SESSION_COOKIE, SESSION_TTL_SECONDS, toPublicUser,
} from '../services/auth.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../utils/password.js';
import { requireAuth, requireClientHeader } from '../middleware/auth.js';
import { HttpError, wrap } from '../utils/http.js';

export const authRouter = Router();
authRouter.use(requireClientHeader);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // تُحتسب المحاولات الفاشلة فقط
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'محاولات دخول كثيرة. حاولي مرة أخرى بعد 15 دقيقة.' },
});

const cookieOptions = {
  httpOnly: true,
  secure: config.secureCookies,
  sameSite: 'strict' as const,
  path: '/',
};

// تجزئة وهمية لمنع كشف وجود اسم المستخدم عبر زمن الاستجابة
const dummyHash = hashPassword('timing-safe-placeholder-0');

authRouter.post(
  '/login',
  loginLimiter,
  wrap(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = usersRepo.findByUsername(username);
    const ok = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyHash), false);
    if (!user || !ok || !user.isActive) throw new HttpError(401, 'اسم المستخدم أو كلمة المرور غير صحيحة');
    usersRepo.touchLogin(user.id);
    res.cookie(SESSION_COOKIE, await createSessionToken(user), { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 });
    res.json({ user: toPublicUser(user), permissions: PERMISSIONS[user.role] });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions).json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store').json({ user: toPublicUser(req.user!), permissions: PERMISSIONS[req.user!.role] });
});

authRouter.get('/setup-status', (_req, res) => {
  res.json({ hasUsers: usersRepo.count() > 0 });
});

authRouter.post(
  '/change-password',
  requireAuth,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().max(200) })
      .parse(req.body);
    const user = req.user!;
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new HttpError(400, 'كلمة المرور الحالية غير صحيحة');
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw new HttpError(400, weak);
    const updated = usersRepo.update(user.id, { passwordHash: await hashPassword(newPassword) })!;
    res.cookie(SESSION_COOKIE, await createSessionToken(updated), { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 });
    res.json({ ok: true });
  }),
);
