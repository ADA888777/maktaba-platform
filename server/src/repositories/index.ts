/**
 * نقطة الوصول الوحيدة للمستودعات. لتغيير طريقة التخزين مستقبلًا
 * يكفي توفير تنفيذ آخر لنفس الواجهات وتصديره من هنا.
 */
export { booksRepo, resourcesRepo, projectsRepo, eventsRepo, surveysRepo, loansRepo } from './sqlite/content.js';
export { categoriesRepo, settingsRepo, usersRepo, visitResponsesRepo } from './sqlite/misc.js';
export * from './types.js';
