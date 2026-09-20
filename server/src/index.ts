import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { bootstrapAdmin } from './services/auth.js';
import { loadSettings } from './services/settings.js';
import { storageConfigured } from './services/storage.js';
import { createApp } from './app.js';

async function main(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL غير مضبوط — ضعي سلسلة اتصال Supabase (PostgreSQL) في متغيرات البيئة');
  }
  await initDatabase(config.databaseUrl);
  console.log('[db] تم الاتصال بقاعدة بيانات PostgreSQL وتطبيق المخطط.');
  await loadSettings();
  await bootstrapAdmin();
  console.log(`[storage] مساحة تخزين الملفات: ${storageConfigured() ? 'Supabase Storage' : 'مجلد محلي (للتطوير فقط)'}`);

createApp().listen(config.port, () => {
  console.log(`[server] الخادم يعمل على المنفذ ${config.port}`);
  if (config.formsDevSink) {
    console.log('[forms] وضع التجربة مفعّل: النماذج غير المربوطة تُتحقق ثم تُتجاهل دون تخزين.');
  }
});
}

main().catch((e) => {
  console.error('[server] فشل بدء التشغيل:', e instanceof Error ? e.message : e);
  process.exit(1);
});
