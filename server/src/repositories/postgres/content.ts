import { createCrudRepository } from './crud.js';
  import type {
Book, BookInput, ElectronicResource, ResourceInput, Project, ProjectInput,
  LibraryEvent, EventInput, Survey, SurveyInput, Loan, LoanInput,
  } from '../types.js';

export const booksRepo = createCrudRepository<Book, BookInput>({
table: 'books',
fields: {
title: ['title', 'text'],
author: ['author', 'text'],
categoryId: ['category_id', 'int'],
specialty: ['specialty', 'text'],
description: ['description', 'text'],
coverUrl: ['cover_url', 'text'],
publisher: ['publisher', 'text'],
publishedYear: ['published_year', 'int'],
copiesTotal: ['copies_total', 'int'],
copiesAvailable: ['copies_available', 'int'],
isActive: ['is_active', 'bool'],
},
searchable: ['title', 'author', 'description'],
filterable: ['categoryId', 'specialty', 'isActive'],
sorts: { newest: 'books.created_at DESC', title: 'lower(books.title) ASC' },
defaultSort: 'books.created_at DESC',
  publishColumn: 'is_active',
  joinCategory: true,
  });

export const resourcesRepo = createCrudRepository<ElectronicResource, ResourceInput>({
table: 'electronic_resources',
  fields: {
name: ['name', 'text'],
  description: ['description', 'text'],
  resourceType: ['resource_type', 'text'],
  specialty: ['specialty', 'text'],
  categoryId: ['category_id', 'int'],
  url: ['url', 'text'],
  icon: ['icon', 'text'],
  imageUrl: ['image_url', 'text'],
  isActive: ['is_active', 'bool'],
  },
  searchable: ['name', 'description', 'resourceType', 'specialty'],
    filterable: ['resourceType', 'specialty', 'categoryId', 'isActive'],
    sorts: { newest: 'electronic_resources.created_at DESC', name: 'lower(electronic_resources.name) ASC' },
    defaultSort: 'electronic_resources.created_at DESC',
      publishColumn: 'is_active',
      joinCategory: true,
      });

export const projectsRepo = createCrudRepository<Project, ProjectInput>({
table: 'projects',
  fields: {
title: ['title', 'text'],
  teamName: ['team_name', 'text'],
  showTeam: ['show_team', 'bool'],
  specialty: ['specialty', 'text'],
  topic: ['topic', 'text'],
  description: ['description', 'text'],
  projectDate: ['project_date', 'text'],
  projectType: ['project_type', 'text'],
  categoryId: ['category_id', 'int'],
  imageUrl: ['image_url', 'text'],
  fileUrl: ['file_url', 'text'],
  isPublished: ['is_published', 'bool'],
  },
  searchable: ['title', 'topic', 'description', 'specialty'],
    filterable: ['specialty', 'projectType', 'categoryId', 'isPublished'],
    sorts: { newest: 'projects.project_date DESC NULLS LAST, projects.id DESC', title: 'lower(projects.title) ASC' },
    defaultSort: 'projects.project_date DESC NULLS LAST, projects.id DESC',
      publishColumn: 'is_published',
      joinCategory: true,
      });

export const eventsRepo = createCrudRepository<LibraryEvent, EventInput>({
table: 'events',
  fields: {
title: ['title', 'text'],
  description: ['description', 'text'],
  startsAt: ['starts_at', 'text'],
  endsAt: ['ends_at', 'text'],
  location: ['location', 'text'],
  department: ['department', 'text'],
  specialty: ['specialty', 'text'],
  imageUrl: ['image_url', 'text'],
  status: ['status', 'text'],
  isPublished: ['is_published', 'bool'],
  },
  searchable: ['title', 'description', 'location', 'department'],
    filterable: ['status', 'department', 'specialty', 'isPublished'],
    sorts: { soonest: 'events.starts_at ASC', latest: 'events.starts_at DESC' },
    defaultSort: 'events.starts_at ASC',
      publishColumn: 'is_published',
      });

export const surveysRepo = createCrudRepository<Survey, SurveyInput>({
table: 'surveys',
fields: {
title: ['title', 'text'],
description: ['description', 'text'],
startDate: ['start_date', 'text'],
endDate: ['end_date', 'text'],
formUrl: ['form_url', 'text'],
reportedResponses: ['reported_responses', 'int'],
isPublished: ['is_published', 'bool'],
},
searchable: ['title', 'description'],
filterable: ['isPublished'],
sorts: { ending: 'surveys.end_date ASC', newest: 'surveys.created_at DESC' },
defaultSort: 'surveys.end_date DESC',
publishColumn: 'is_published',
  });

export const loansRepo = createCrudRepository<Loan, LoanInput>({
table: 'loans',
fields: {
referenceCode: ['reference_code', 'text'],
bookId: ['book_id', 'int'],
bookTitle: ['book_title', 'text'],
specialty: ['specialty', 'text'],
borrowDate: ['borrow_date', 'text'],
expectedReturnDate: ['expected_return_date', 'text'],
status: ['status', 'text'],
channel: ['channel', 'text'],
isDemo: ['is_demo', 'bool'],
},
searchable: ['referenceCode', 'bookTitle', 'specialty'],
filterable: ['status', 'bookId', 'specialty', 'channel'],
sorts: { newest: 'loans.created_at DESC', oldest: 'loans.created_at ASC' },
defaultSort: 'loans.created_at DESC',
  });
