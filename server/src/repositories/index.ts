/**
* Single entry point for repositories. Switching the storage engine only means
* providing another implementation of the same interfaces and exporting it here.
* Current implementation: PostgreSQL (Supabase).
*/
export { booksRepo, resourcesRepo, projectsRepo, eventsRepo, surveysRepo, loansRepo } from './postgres/content.js';
export { categoriesRepo, settingsRepo, usersRepo, visitResponsesRepo } from './postgres/misc.js';
export * from './types.js';
