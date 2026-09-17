import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request } from 'express';
import multer from 'multer';
import { z, type ZodType } from 'zod';
import { config } from '../config.js';
import {
  booksRepo, categoriesRepo, eventsRepo, loansRepo, projectsRepo, resourcesRepo, surveysRepo,
  usersRepo, visitResponsesRepo, type CrudRepository, type ListQuery, type LoanStatus,
} from '../repositories/index.js';
import {
  bookSchema, categorySchema, eventSchema, projectSchema, resourceSchema, surveySchema,
  userCreateSchema, userUpdateSchema,
} from '../schemas.js';
import { requireAuth, requireClientHeader, requirePermission } from '../middleware/auth.js';
import { clearDemoData, getDashboardStats, resetAllAnalytics } from '../services/analytics.js';
import { changeLoanStatus, deleteLoan } from '../services/loans.js';
import { getSettings, isMicrosoftFormsUrl, saveSettings } from '../services/settings.js';
import { relayAvailability } from '../services/forms.js';
import { toPublicUser } from '../services/auth.js';
import { hashPassword, validatePasswordStrength } from '../utils/password.js';
import { HttpError, notFound, parseId, wrap } from '../utils/http.js';
import { eventPhase, surveyState } from './public.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireClientHeader);

const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v.slice(0, 120) : undefined);
const num = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined);

/* ─────────────── الإحصائيات ─────────────── */
adminRouter.get('/stats', requirePermission('stats'), (req, res) => {
  const raw = str(req.query.days);
  const days = raw === 'all' ? null : Math.min(Math.max(num(raw) ?? 30, 1), 3650);
  res.set('Cache-Control', 'no-store').json(getDashboardStats(days));
});

/* ─────────────── مولّد مسارات CRUD ─────────────── */
function crudRoutes<T extends { id: number }, TInput>(
  base: string,
  repo: CrudRepository<T, TInput>,
  schema: ZodType,
  opts: {
    label: string;
    filters: string[];
    decorate?: (item: T) => unknown;
    beforeSave?: (data: TInput, req: Request, existing?: T) => void;
  },
) {
  const router = Router();
  router.use(requirePermission('content'));
  const decorate = opts.decorate ?? ((x: T) => x);

  router.get('/', (req, res) => {
    const q: ListQuery = {
      search: str(req.query.search),
      page: num(req.query.page),
      pageSize: num(req.query.pageSize) ?? 20,
      sort: str(req.query.sort),
      filters: Object.fromEntries(opts.filters.map((f) => [f, str(req.query[f])])),
    };
    const result = repo.list(q);
    res.set('Cache-Control', 'no-store').json({ ...result, items: result.items.map(decorate) });
  });

  router.get('/:id', (req, res) => {
    const item = repo.get(parseId(req.params.id));
    if (!item) throw notFound(opts.label);
    res.json(decorate(item));
  });

  router.post('/', (req, res) => {
    const data = schema.parse(req.body) as TInput;
    opts.beforeSave?.(data, req);
    res.status(201).json(decorate(repo.create(data)));
  });

  router.put('/:id', (req, res) => {
    const id = parseId(req.params.id);
    const existing = repo.get(id);
    if (!existing) throw notFound(opts.label);
    const data = schema.parse(req.body) as TInput;
    opts.beforeSave?.(data, req, existing);
    res.json(decorate(repo.update(id, data)!));
  });

  router.delete('/:id', (req, res) => {
    if (!repo.remove(parseId(req.params.id))) throw notFound(opts.label);
    res.json({ ok: true });
  });

  adminRouter.use(base, router);
}

const ensureCategory = (kind: 'book' | 'resource' | 'project') => (data: { categoryId?: number | null }) => {
  if (data.categoryId) {
    const c = categoriesRepo.get(data.categoryId);
    if (!c || c.kind !== kind) throw new HttpError(400, 'التصنيف المختار غير صالح');
  }
};

crudRoutes('/books', booksRepo, bookSchema, {
  label: 'الكتاب',
  filters: ['categoryId', 'specialty', 'isActive'],
  beforeSave: (data, _req, existing) => {
    ensureCategory('book')(data);
    if (existing) {
      // لا يمكن أن يقل الإجمالي عن النسخ المستعارة فعليًا
      const borrowed = loansRepo.count({ bookId: existing.id, status: 'borrowed' });
      if (data.copiesTotal - data.copiesAvailable < borrowed) {
        throw new HttpError(400, `يوجد ${borrowed} نسخة مستعارة حاليًا من هذا الكتاب؛ عدّلي الأرقام بما يتوافق معها`);
      }
    }
  },
});
crudRoutes('/resources', resourcesRepo, resourceSchema, {
  label: 'المصدر',
  filters: ['resourceType', 'specialty', 'categoryId', 'isActive'],
  beforeSave: ensureCategory('resource'),
});
crudRoutes('/projects', projectsRepo, projectSchema, {
  label: 'المشروع',
  filters: ['specialty', 'projectType', 'categoryId', 'isPublished'],
  beforeSave: ensureCategory('project'),
});
crudRoutes('/events', eventsRepo, eventSchema, {
  label: 'الفعالية',
  filters: ['status', 'department', 'isPublished'],
  decorate: (e) => ({ ...e, phase: eventPhase(e) }),
});
crudRoutes('/surveys', surveysRepo, surveySchema, {
  label: 'الاستبيان',
  filters: ['isPublished'],
  decorate: (s) => ({ ...s, state: surveyState(s) }),
  beforeSave: (data) => {
    if (data.formUrl && !isMicrosoftFormsUrl(data.formUrl)) {
      throw new HttpError(400, 'رابط الاستبيان يجب أن يكون من Microsoft Forms التابع لحساب المؤسسة', {
        fields: { formUrl: 'رابط Microsoft Forms غير صالح' },
      });
    }
  },
});

/* ─────────────── التصنيفات ─────────────── */
adminRouter.get('/categories', requirePermission('content'), (req, res) => {
  const kind = str(req.query.kind) as 'book' | 'resource' | 'project' | undefined;
  res.json(categoriesRepo.list(kind));
});
adminRouter.post('/categories', requirePermission('content'), (req, res) => {
  const data = categorySchema.parse(req.body);
  try {
    res.status(201).json(categoriesRepo.create(data.name, data.kind));
  } catch {
    throw new HttpError(409, 'هذا التصنيف موجود مسبقًا');
  }
});
adminRouter.put('/categories/:id', requirePermission('content'), (req, res) => {
  const { name } = categorySchema.pick({ name: true }).parse(req.body);
  const id = parseId(req.params.id);
  if (!categoriesRepo.get(id)) throw notFound('التصنيف');
  try {
    res.json(categoriesRepo.rename(id, name));
  } catch {
    throw new HttpError(409, 'يوجد تصنيف آخر بنفس الاسم');
  }
});
adminRouter.delete('/categories/:id', requirePermission('content'), (req, res) => {
  if (!categoriesRepo.remove(parseId(req.params.id))) throw notFound('التصنيف');
  res.json({ ok: true });
});

/* ─────────────── الاستعارات (سجلات مجهولة) ─────────────── */
const loanStatuses = ['requested', 'borrowed', 'returned', 'cancelled'] as const;

adminRouter.get('/loans', requirePermission('loans'), (req, res) => {
  const q: ListQuery = {
    search: str(req.query.search),
    page: num(req.query.page),
    pageSize: num(req.query.pageSize) ?? 20,
    sort: str(req.query.sort),
    filters: { status: str(req.query.status), bookId: num(req.query.bookId), specialty: str(req.query.specialty) },
  };
  if (req.query.overdue === 'true') {
    q.where = { sql: `loans.status = 'borrowed' AND loans.expected_return_date < ?`, params: [new Date().toISOString().slice(0, 10)] };
  }
  res.set('Cache-Control', 'no-store').json(loansRepo.list(q));
});

adminRouter.patch('/loans/:id', requirePermission('loans'), (req, res) => {
  const { status } = z.object({ status: z.enum(loanStatuses) }).parse(req.body);
  res.json(changeLoanStatus(parseId(req.params.id), status as LoanStatus));
});

adminRouter.delete('/loans/:id', requirePermission('loans'), (req, res) => {
  deleteLoan(parseId(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/loans-export.csv', requirePermission('loans'), (_req, res) => {
  const statusLabel: Record<string, string> = { requested: 'طلب جديد', borrowed: 'مستعار', returned: 'تم الإرجاع', cancelled: 'ملغي' };
  const all = loansRepo.list({ pageSize: 200, page: 1 });
  const rows = [...all.items];
  for (let p = 2; (p - 1) * 200 < all.total; p++) rows.push(...loansRepo.list({ pageSize: 200, page: p }).items);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;
  const lines = [
    ['الرمز المرجعي', 'الكتاب', 'التخصص', 'تاريخ الاستعارة', 'تاريخ الإرجاع المتوقع', 'الحالة', 'تاريخ الطلب'].map(esc).join(','),
    ...rows.map((l) =>
      [l.referenceCode, l.bookTitle, l.specialty, l.borrowDate, l.expectedReturnDate, statusLabel[l.status], l.createdAt.slice(0, 10)]
        .map(esc)
        .join(','),
    ),
  ];
  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', 'attachment; filename="loans.csv"')
    .send('﻿' + lines.join('\r\n'));
});

/* ─────────────── استطلاع الزيارة (مجهول) ─────────────── */
adminRouter.get('/visit-responses', requirePermission('stats'), (req, res) => {
  const pageSize = Math.min(num(req.query.pageSize) ?? 20, 100);
  const page = Math.max(num(req.query.page) ?? 1, 1);
  const result = visitResponsesRepo.list(pageSize, (page - 1) * pageSize);
  res.set('Cache-Control', 'no-store').json({ ...result, page, pageSize });
});

/* ─────────────── الإعدادات ─────────────── */
adminRouter.get('/settings', requirePermission('settings'), (_req, res) => {
  res.json({
    settings: getSettings(),
    relay: { borrow: relayAvailability('borrow'), visit: relayAvailability('visit') },
    environment: { production: config.isProduction },
  });
});

adminRouter.put('/settings', requirePermission('settings'), (req, res) => {
  const saved = saveSettings(req.body);
  for (const key of ['borrow', 'visit'] as const) {
    if (saved[key].mode === 'flow' && !relayAvailability(key).flowConfigured && !relayAvailability(key).devSink) {
      // الحفظ مسموح، لكن نُنبه أن الإرسال سيفشل حتى يُضبط رابط التدفق
      res.setHeader('X-Settings-Warning', encodeURIComponent(`رابط تدفق ${key} غير مضبوط في متغيرات البيئة`));
    }
  }
  res.json({ settings: saved });
});

adminRouter.post('/settings/clear-demo', requirePermission('settings'), (_req, res) => {
  res.json(clearDemoData());
});

adminRouter.post('/settings/reset-analytics', requirePermission('settings'), (req, res) => {
  z.object({ confirm: z.literal('حذف') }).parse(req.body);
  res.json({ deleted: resetAllAnalytics() });
});

/* ─────────────── المستخدمون والصلاحيات ─────────────── */
adminRouter.get('/users', requirePermission('users'), (_req, res) => {
  res.json(usersRepo.list().map(toPublicUser));
});

adminRouter.post(
  '/users',
  requirePermission('users'),
  wrap(async (req, res) => {
    const data = userCreateSchema.parse(req.body);
    const weak = validatePasswordStrength(data.password);
    if (weak) throw new HttpError(400, weak, { fields: { password: weak } });
    if (usersRepo.findByUsername(data.username)) throw new HttpError(409, 'اسم المستخدم مستخدم مسبقًا');
    const user = usersRepo.create({ ...data, passwordHash: await hashPassword(data.password) });
    res.status(201).json(toPublicUser(user));
  }),
);

adminRouter.put(
  '/users/:id',
  requirePermission('users'),
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const target = usersRepo.get(id);
    if (!target) throw notFound('المستخدم');
    const data = userUpdateSchema.parse(req.body);
    const losesAdmin = (data.role && data.role !== 'admin') || data.isActive === false;
    if (target.role === 'admin' && losesAdmin && usersRepo.countActiveAdmins(id) === 0) {
      throw new HttpError(400, 'يجب أن يبقى حساب مسؤولة واحد مفعّل على الأقل');
    }
    let passwordHash: string | undefined;
    if (data.password) {
      const weak = validatePasswordStrength(data.password);
      if (weak) throw new HttpError(400, weak);
      passwordHash = await hashPassword(data.password);
    }
    const updated = usersRepo.update(id, { displayName: data.displayName, role: data.role, isActive: data.isActive, passwordHash })!;
    res.json(toPublicUser(updated));
  }),
);

adminRouter.delete('/users/:id', requirePermission('users'), (req, res) => {
  const id = parseId(req.params.id);
  if (id === req.user!.id) throw new HttpError(400, 'لا يمكنك حذف حسابك الحالي');
  const target = usersRepo.get(id);
  if (!target) throw notFound('المستخدم');
  if (target.role === 'admin' && usersRepo.countActiveAdmins(id) === 0) {
    throw new HttpError(400, 'يجب أن يبقى حساب مسؤولة واحد مفعّل على الأقل');
  }
  usersRepo.remove(id);
  res.json({ ok: true });
});

/* ─────────────── رفع الصور والملفات (محتوى عام فقط) ─────────────── */
const allowed: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
fs.mkdirSync(config.uploadsDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${allowed[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (allowed[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'نوع الملف غير مدعوم. المسموح: PNG, JPG, WEBP, PDF'));
  },
});

/** يتحقق من التوقيع الفعلي للملف وليس فقط نوعه المعلن */
function matchesSignature(file: string, mimetype: string) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(file, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  if (mimetype === 'image/png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mimetype === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (mimetype === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (mimetype === 'application/pdf') return buf.toString('ascii', 0, 4) === '%PDF';
  return false;
}

adminRouter.post('/uploads', requirePermission('content'), (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(400, 'حجم الملف يتجاوز 5 ميجابايت'));
      }
      return next(err);
    }
    if (!req.file) return next(new HttpError(400, 'لم يتم اختيار ملف'));
    if (!matchesSignature(req.file.path, req.file.mimetype)) {
      fs.rmSync(req.file.path, { force: true });
      return next(new HttpError(400, 'محتوى الملف لا يطابق نوعه'));
    }
    res.status(201).json({ url: `/uploads/${path.basename(req.file.path)}` });
  });
});
