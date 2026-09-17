export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: number;
  name: string;
  kind: 'book' | 'resource' | 'project';
  usage?: number;
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
}

export type EventPhase = 'upcoming' | 'ongoing' | 'past';
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
  status: 'scheduled' | 'postponed' | 'cancelled';
  isPublished: boolean;
  phase: EventPhase;
}

export type SurveyState = 'upcoming' | 'active' | 'ended';
export interface Survey {
  id: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  formUrl: string;
  hasForm?: boolean;
  reportedResponses?: number | null;
  isPublished: boolean;
  state: SurveyState;
}

export type LoanStatus = 'requested' | 'borrowed' | 'returned' | 'cancelled';
export interface Loan {
  id: number;
  referenceCode: string;
  bookId: number | null;
  bookTitle: string;
  specialty: string;
  borrowDate: string;
  expectedReturnDate: string | null;
  status: LoanStatus;
  channel: 'msforms' | 'flow' | 'sink';
  isDemo: boolean;
  createdAt: string;
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

export type FormMode = 'msforms' | 'flow';
export interface FormConfig {
  mode: FormMode;
  msFormUrl: string;
  openIn: 'newtab' | 'embed';
  prefill: Record<string, string>;
}

export interface SiteSettings {
  site: {
    libraryName: string;
    institutionName: string;
    tagline: string;
    logoUrl: string;
    location: string;
    workingHours: string;
    contactEmail: string;
    formsOwnerAccount: string;
  };
  lists: {
    specialties: string[];
    resourceTypes: string[];
    projectTypes: string[];
    departments: string[];
  };
  borrow: FormConfig & {
    requireEmail: boolean;
    requirePhone: boolean;
    requireReturnDate: boolean;
    defaultLoanDays: number;
  };
  visit: FormConfig;
  notifications: { enabled: boolean; daysAhead: number };
}

export interface RelayAvailability {
  flowConfigured: boolean;
  devSink: boolean;
}

export interface PublicConfig extends Omit<SiteSettings, 'lists'> {
  lists: SiteSettings['lists'];
  relay: { borrow: RelayAvailability; visit: RelayAvailability };
  options: {
    visitReasons: string[];
    visitServices: string[];
    visitFrequencies: string[];
    resourceIcons: string[];
  };
}

export interface PublicStats {
  visitors: number;
  resources: number;
  books: number;
  loans: number;
  projects: number;
  surveyParticipations: number;
}

export type UserRole = 'admin' | 'librarian';
export type Permission = 'content' | 'stats' | 'loans' | 'settings' | 'users';
export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LabelValue {
  label: string;
  value: number;
}

export interface DashboardStats {
  range: { days: number | null; since: string };
  overview: {
    visitors: number;
    pageViews: number;
    resourcesVisits: number;
    resourceOpens: number;
    loans: number;
    borrowedCopies: number;
    projects: number;
    upcomingEvents: number;
    surveyParticipations: number;
    visitSurveyResponses: number;
  };
  series: {
    daily: { day: string; views: number; visitors: number; resources: number; loans: number }[];
    monthly: { month: string; views: number; visitors: number }[];
  };
  resources: { visits: number; opens: number; total: number; active: number; top: LabelValue[]; byType: LabelValue[] };
  books: {
    total: number;
    titlesAvailable: number;
    titlesUnavailable: number;
    copiesTotal: number;
    copiesBorrowed: number;
    visits: number;
    topBorrowed: LabelValue[];
    byCategory: LabelValue[];
  };
  loans: {
    total: number;
    starts: number;
    byStatus: LabelValue[];
    bySpecialty: LabelValue[];
    byMonth: { month: string; value: number }[];
    overdue: number;
  };
  projects: {
    total: number;
    upcomingEvents: number;
    pastEvents: number;
    visits: number;
    eventsVisits: number;
    bySpecialty: LabelValue[];
    byType: LabelValue[];
  };
  surveys: {
    total: number;
    active: number;
    participations: number;
    reportedResponses: number;
    visits: number;
    bySurvey: (LabelValue & { reported: number | null })[];
  };
  visit: {
    total: number;
    visited: number;
    notVisited: number;
    visitedPct: number;
    notVisitedPct: number;
    pageVisits: number;
    reasons: LabelValue[];
    services: LabelValue[];
    bySpecialty: LabelValue[];
  };
  demoData: { events: number; loans: number; visitResponses: number };
}
