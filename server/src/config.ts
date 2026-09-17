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
  databasePath: path.resolve(env.DATABASE_PATH ?? './data/library.db'),
  uploadsDir: path.resolve(env.UPLOADS_DIR ?? './uploads'),
  sessionSecret: secret('SESSION_SECRET'),
  analyticsSalt: secret('ANALYTICS_SALT'),
  admin: {
    username: env.ADMIN_USERNAME?.trim() || '',
    displayName: env.ADMIN_DISPLAY_NAME?.trim() || 'مسؤولة المكتبة',
    passwordHash: env.ADMIN_PASSWORD_HASH?.trim() || '',
  },
  flows: {
    borrow: env.FLOW_URL_BORROW?.trim() || '',
    visit: env.FLOW_URL_VISIT?.trim() || '',
  } as Record<string, string>,
  /** ملفات تعريف الارتباط الآمنة تتطلب HTTPS؛ تُفعّل تلقائيًا في الإنتاج */
  secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : isProduction,
  formsDevSink: !isProduction && env.FORMS_DEV_SINK === 'true',
  seedDemoAnalytics: env.SEED_DEMO_ANALYTICS === 'true',
  clientDist: path.resolve(env.CLIENT_DIST ?? '../client/dist'),
};

export type FormKey = 'borrow' | 'visit';
