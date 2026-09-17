import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound = (what = 'العنصر') => new HttpError(404, `${what} غير موجود`);

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

/** يلتقط أخطاء الدوال غير المتزامنة ويمررها لمعالج الأخطاء */
export const wrap = (fn: Handler): Handler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'البيانات المرسلة غير مكتملة أو غير صحيحة',
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    res.status(413).json({ error: 'حجم البيانات المرسلة كبير جدًا' });
    return;
  }
  // لا نطبع جسم الطلب أبدًا حتى لا تظهر بيانات شخصية في السجلات
  console.error('[error]', err instanceof Error ? err.message : err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
}

export function parseId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'معرّف غير صالح');
  return id;
}
