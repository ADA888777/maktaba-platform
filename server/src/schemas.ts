import { z } from 'zod';
import { RESOURCE_ICONS, VISIT_FREQUENCIES, VISIT_REASONS, VISIT_SERVICES } from './constants.js';

const text = (max: number) => z.string().trim().max(max, `الحد الأقصى ${max} حرفًا`);
const required = (label: string, max = 200) => z.string().trim().min(1, `${label} مطلوب`).max(max, `الحد الأقصى ${max} حرفًا`);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ غير صالح');

/** رابط http(s) أو ملف مرفوع داخل المنصة أو فارغ */
export const mediaUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === '' || v.startsWith('/uploads/') || /^https?:\/\/\S+$/i.test(v), 'رابط غير صالح');

export const httpUrl = z.string().trim().max(1000).regex(/^https?:\/\/\S+$/i, 'يجب أن يبدأ الرابط بـ http:// أو https://');

const nullableInt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.coerce.number().int().nullable(),
);

export const bookSchema = z
  .object({
    title: required('اسم الكتاب'),
    author: text(150).default(''),
    categoryId: nullableInt.default(null),
    specialty: text(80).default(''),
    description: text(2000).default(''),
    coverUrl: mediaUrl.default(''),
    publisher: text(150).default(''),
    publishedYear: nullableInt.refine((v) => v === null || (v >= 1000 && v <= 2100), 'سنة غير صالحة').default(null),
    copiesTotal: z.coerce.number().int().min(0).max(999),
    copiesAvailable: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean().default(true),
  })
  .refine((b) => b.copiesAvailable <= b.copiesTotal, {
    message: 'عدد النسخ المتاحة لا يمكن أن يتجاوز إجمالي النسخ',
    path: ['copiesAvailable'],
  });

export const resourceSchema = z.object({
  name: required('اسم المصدر'),
  description: text(1500).default(''),
  resourceType: text(60).default(''),
  specialty: text(80).default(''),
  categoryId: nullableInt.default(null),
  url: httpUrl,
  icon: z.enum(RESOURCE_ICONS).default('globe'),
  imageUrl: mediaUrl.default(''),
  isActive: z.boolean().default(true),
});

export const projectSchema = z.object({
  title: required('اسم المشروع'),
  teamName: text(200).default(''),
  showTeam: z.boolean().default(false),
  specialty: text(80).default(''),
  topic: text(200).default(''),
  description: text(2000).default(''),
  projectDate: isoDate.nullable().or(z.literal('').transform(() => null)).default(null),
  projectType: text(60).default(''),
  categoryId: nullableInt.default(null),
  imageUrl: mediaUrl.default(''),
  fileUrl: mediaUrl.default(''),
  isPublished: z.boolean().default(true),
});

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'تاريخ ووقت غير صالحين')
  .transform((v) => new Date(v).toISOString());

export const eventSchema = z
  .object({
    title: required('عنوان الفعالية'),
    description: text(2000).default(''),
    startsAt: isoDateTime,
    endsAt: isoDateTime.nullable().or(z.literal('').transform(() => null)).default(null),
    location: text(150).default(''),
    department: text(100).default(''),
    specialty: text(80).default(''),
    imageUrl: mediaUrl.default(''),
    status: z.enum(['scheduled', 'postponed', 'cancelled']).default('scheduled'),
    isPublished: z.boolean().default(true),
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, { message: 'وقت الانتهاء يجب أن يكون بعد وقت البداية', path: ['endsAt'] });

export const surveySchema = z
  .object({
    title: required('عنوان الاستبيان'),
    description: text(1500).default(''),
    startDate: isoDate,
    endDate: isoDate,
    formUrl: z.string().trim().max(2000).default(''),
    reportedResponses: nullableInt.refine((v) => v === null || v >= 0, 'قيمة غير صالحة').default(null),
    isPublished: z.boolean().default(true),
  })
  .refine((s) => s.endDate >= s.startDate, { message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', path: ['endDate'] });

export const categorySchema = z.object({
  name: required('اسم التصنيف', 80),
  kind: z.enum(['book', 'resource', 'project']),
});

/* ───────── النماذج العامة ───────── */

const specialty = required('التخصص', 80);

const returnAfterBorrow = <T extends { borrowDate: string; returnDate?: string | null }>(v: T) =>
  !v.returnDate || v.returnDate >= v.borrowDate;

/** الجزء غير الشخصي من طلب الاستعارة — هو الوحيد الذي يصل إلى قاعدة بيانات الموقع */
export const loanRequestSchema = z
  .object({
    bookId: z.coerce.number().int().positive(),
    specialty,
    borrowDate: isoDate,
    returnDate: isoDate.nullable().optional(),
  })
  .refine(returnAfterBorrow, { message: 'تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستعارة', path: ['returnDate'] });

const arabicOrLatinName = z
  .string()
  .trim()
  .min(3, 'الاسم مطلوب (3 أحرف على الأقل)')
  .max(100)
  .regex(/^[\p{L}\s.'-]+$/u, 'الاسم يجب أن يحتوي على حروف فقط');

export const borrowRelaySchema = (opts: { requireEmail: boolean; requirePhone: boolean; requireReturnDate: boolean }) =>
  z
    .object({
      fullName: arabicOrLatinName,
      traineeId: z.string().trim().regex(/^\d{5,15}$/, 'الرقم التدريبي يجب أن يتكون من 5 إلى 15 رقمًا'),
      specialty,
      email: opts.requireEmail
        ? z.email('بريد إلكتروني غير صالح')
        : z.union([z.literal(''), z.email('بريد إلكتروني غير صالح')]).default(''),
      phone: opts.requirePhone
        ? z.string().trim().regex(/^05\d{8}$/, 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام')
        : z.union([z.literal(''), z.string().trim().regex(/^05\d{8}$/, 'رقم الجوال غير صالح')]).default(''),
      bookId: z.coerce.number().int().positive(),
      borrowDate: isoDate,
      returnDate: opts.requireReturnDate ? isoDate : isoDate.or(z.literal('')).nullable().optional(),
      notes: text(500).default(''),
    })
    .refine(returnAfterBorrow, { message: 'تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستعارة', path: ['returnDate'] });

const visitBase = z.object({
  specialty,
  hasVisited: z.boolean(),
  reasons: z.array(z.enum(VISIT_REASONS)).max(VISIT_REASONS.length).default([]),
  mainService: z.enum(VISIT_SERVICES).or(z.literal('')).default(''),
  visitFrequency: z.enum(VISIT_FREQUENCIES).or(z.literal('')).default(''),
});

const visitRules = <T extends z.infer<typeof visitBase>>(v: T, ctx: z.RefinementCtx) => {
  if (!v.hasVisited && v.reasons.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['reasons'], message: 'اختاري سببًا واحدًا على الأقل' });
  }
  if (!v.mainService) ctx.addIssue({ code: 'custom', path: ['mainService'], message: 'اختاري الخدمة التي تستخدمينها غالبًا' });
};

/** الجزء المجهول من استطلاع الزيارة (للإحصائيات) */
export const visitAnonymousSchema = visitBase.superRefine(visitRules);

/** النموذج الكامل عند الإرسال عبر Power Automate */
export const visitRelaySchema = visitBase
  .extend({
    fullName: arabicOrLatinName,
    otherReason: text(300).default(''),
    otherService: text(150).default(''),
    suggestions: text(1000).default(''),
  })
  .superRefine(visitRules);

export const trackSchema = z.object({
  type: z.string(),
  targetId: z.coerce.number().int().positive().nullable().optional(),
  path: z.string().max(120).optional(),
  sessionId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'اسم المستخدم مطلوب').max(60),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(200),
});

export const userCreateSchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9._-]{3,40}$/, 'اسم المستخدم: 3-40 حرفًا إنجليزيًا أو أرقامًا'),
  displayName: required('الاسم الظاهر', 80),
  password: z.string().min(10).max(200),
  role: z.enum(['admin', 'librarian']),
});

export const userUpdateSchema = z.object({
  displayName: required('الاسم الظاهر', 80).optional(),
  role: z.enum(['admin', 'librarian']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10).max(200).optional(),
});
