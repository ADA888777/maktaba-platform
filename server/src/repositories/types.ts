/**
* Domain types and repository interfaces.
* The rest of the server only talks to these interfaces, so the storage layer
* (PostgreSQL / Supabase) can be swapped without touching routes.
*/

export type CategoryKind = 'book' | 'resource' | 'project';

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  categoryId: number | null;
  categoryName?: string | null;
  specialty: string;
  description: string;
  coverUrl: string;
  publisher: string;
  publishedYear: number | null;
  copiesTotal: number;
  copiesAvailable: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ElectronicResource {
  id: number;
  name: string;
  description: string;
  resourceType: string;
  specialty: string;
  categoryId: number | null;
  categoryName?: string | null;
  url: string;
  icon: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  title: string;
  teamName: string;
  showTeam: boolean;
  specialty: string;
  topic: string;
  description: string;
  projectDate: string | null;
  projectType: string;
  categoryId: number | null;
  categoryName?: string | null;
  imageUrl: string;
  fileUrl: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'scheduled' | 'postponed' | 'cancelled';

export interface LibraryEvent {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  department: string;
  specialty: string;
  imageUrl: string;
  status: EventStatus;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  formUrl: string;
  reportedResponses: number | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LoanStatus = 'requested' | 'borrowed' | 'returned' | 'cancelled';
export type LoanChannel = 'msforms' | 'flow' | 'sink';

export interface Loan {
  id: number;
  referenceCode: string;
  bookId: number | null;
  bookTitle: string;
  specialty: string;
  borrowDate: string;
  expectedReturnDate: string | null;
  status: LoanStatus;
  channel: LoanChannel;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisitResponse {
  id: number;
  hasVisited: boolean;
  specialty: string;
  reasons: string[];
  mainService: string;
  visitFrequency: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'librarian';

export interface User {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export type PublicUser = Omit<User, 'passwordHash' | 'tokenVersion'>;

export interface ListQuery {
  search?: string;
  filters?: Record<string, string | number | boolean | undefined>;
  page?: number;
  pageSize?: number;
  /** when true only published or active items are returned */
publicOnly?: boolean;
  sort?: string;
  /** extra condition built by the server only (never taken from user input) */
where?: { sql: string; params: (string | number)[] };
}

export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CrudRepository<T, TInput> {
  list(query?: ListQuery): Promise<ListResult<T>>;
  get(id: number): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: number, input: Partial<TInput>): Promise<T | null>;
  remove(id: number): Promise<boolean>;
  count(where?: Record<string, string | number>): Promise<number>;
}

type Editable<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'categoryName'>;
export type BookInput = Editable<Book>;
export type ResourceInput = Editable<ElectronicResource>;
export type ProjectInput = Editable<Project>;
export type EventInput = Editable<LibraryEvent>;
export type SurveyInput = Editable<Survey>;
export type LoanInput = Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>;
