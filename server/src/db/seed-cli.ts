import { config } from '../config.js';
import { initDatabase } from './connection.js';
import { seedIfEmpty } from './seed.js';

initDatabase(config.databasePath);
if (!seedIfEmpty({ demoAnalytics: config.seedDemoAnalytics })) {
  console.log('[seed] قاعدة البيانات تحتوي على بيانات مسبقًا — لم يتم تغيير شيء.');
}
