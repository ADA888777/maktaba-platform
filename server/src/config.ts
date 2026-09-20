import path from 'node:path';
import crypto from 'node:crypto';

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

function secret(name: string): string {
    const value = env[name];
    if (value && value.length >= 32) return value;
    if (isProduction) {
          throw new Error(`المتغير ${name} مطلوب في بيئة الإنتاج ويجب ألا يقل عن 32 حرفًا`);
    }
    // في التطوير فقط: مفتاح مؤقت يتغير مع كل تشغيل (تُلغى الجلسات عند إعادة التشغيل)
  console.warn(`[config] ${name} غير مضبوط — تم توليد قيمة مؤقتة للتطوير فقط.`);
    return crypto.randomBytes(48).toString('hex');
}

export const config = {
    isProduction,
    port: Number(env.PORT ?? 4000),
    clientOrigin: env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    /** سلسلة اتصال PostgreSQL (Supabase) — من متغيرات البيئة فقط */
    databaseUrl: (env.DATABASE_URL ?? '').trim(),
    /** مجلد محلي احتياطي للملفات المرفوعة عند عدم إعداد Supabase Storage (للتطوير) */
    uploadsDir: path.resolve(env.UPLOADS_DIR ?? './uploads'),
    supabase: {
          url: (env.SUPABASE_URL ?? '').trim().replace(/\/$/, ''),
          serviceKey: (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
          bucket: (env.SUPABASE_BUCKET ?? 'uploads').trim(),
    },
    sessionSecret: secret('SESSION_SECRET'),
    analyticsSalt: secret('ANALYTICS_SALT'),
    admin: {
          username: env.ADMIN_USERNAME?.trim() || '',
          displayName: env.ADMIN_DISPLAY_NAME?.trim() || 'مسؤولة المكتبة',
          /** تجزئة جاهزة (npm run hash-password) — تُستخدم إن وُجدت */
          passwordHash: env.ADMIN_PASSWORD_HASH?.trim() || '',
          /** كلمة مرور نصية تُجزَّأ عند أول تشغيل ثم تُخزَّن مجزّأة فقط */
          password: env.ADMIN_PASSWORD ?? '',
          /** عند true تُعاد كلمة مرور المسؤولة إلى قيمة ADMIN_PASSWORD عند التشغيل */
          resetPassword: env.ADMIN_RESET_PASSWORD === 'true',
    },
    flows: {
          borrow: env.FLOW_URL_BORROW?.trim() || '',
          visit: env.FLOW_URL_VISIT?.trim() || '',
    } as Record<string, string>,
    /** ملفات تعريف الارتباط الآمنة تتطلب HTTPS؛ تُفعّل تلقائيًا في الإنتاج */
    secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : isProduction,
    formsDevSink: !isProduction && env.FORMS_DEV_SINK === 'true',
    clientDist: path.resolve(env.CLIENT_DIST ?? '../client/dist'),
};

export type FormKey = 'borrow' | 'visit';
