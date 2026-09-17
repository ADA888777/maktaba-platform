import { config } from './config.js';
import { initDatabase } from './db/connection.js';
import { seedIfEmpty } from './db/seed.js';
import { bootstrapAdmin } from './services/auth.js';
import { createApp } from './app.js';

initDatabase(config.databasePath);
seedIfEmpty({ demoAnalytics: config.seedDemoAnalytics });
bootstrapAdmin();

createApp().listen(config.port, () => {
  console.log(`[server] الخادم يعمل على http://localhost:${config.port}`);
  if (config.formsDevSink) {
    console.log('[forms] وضع التجربة مفعّل: النماذج غير المربوطة تُتحقق ثم تُتجاهل دون تخزين.');
  }
});
