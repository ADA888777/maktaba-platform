import { z } from 'zod';
import { settingsRepo } from '../repositories/index.js';

/** Allowed Microsoft Forms hosts - any link outside these is rejected */
export const MS_FORMS_HOSTS = ['forms.office.com', 'forms.microsoft.com', 'forms.cloud.microsoft', 'forms.office365.us'];

export function isMicrosoftFormsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && MS_FORMS_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const msFormUrl = z
.string()
.trim()
.max(2000)
.refine((v) => v === '' || isMicrosoftFormsUrl(v), 'يجب أن يكون الرابط من Microsoft Forms ويبدأ بـ https://forms.office.com');

/** Borrow form fields that can be prefilled */
export const BORROW_FIELDS = [
  'fullName', 'traineeId', 'specialty', 'email', 'phone',
  'bookTitle', 'bookAuthor', 'borrowDate', 'returnDate', 'notes', 'referenceCode',
  ] as const;
export const VISIT_FIELDS = [
  'fullName', 'specialty', 'hasVisited', 'reasons', 'otherReason', 'mainService', 'otherService', 'visitFrequency', 'suggestions',
  ] as const;

const prefillMap = z.record(z.string(), z.string().trim().max(120).regex(/^[A-Za-z0-9_-]*$/, 'معرّف سؤال غير صالح'));

const formConfig = z.object({
  /** msforms: open the official prefilled form - flow: send through Power Automate */
                            mode: z.enum(['msforms', 'flow']),
  msFormUrl,
  openIn: z.enum(['newtab', 'embed']),
  prefill: prefillMap,
});

export const settingsSchema = z.object({
  site: z.object({
    libraryName: z.string().trim().min(2).max(80),
    institutionName: z.string().trim().max(120),
    tagline: z.string().trim().max(200),
    logoUrl: z.string().trim().max(500),
    location: z.string().trim().max(200),
    workingHours: z.string().trim().max(200),
    contactEmail: z.union([z.literal(''), z.email('بريد إلكتروني غير صالح')]),
    formsOwnerAccount: z.union([z.literal(''), z.email('بريد إلكتروني غير صالح')]),
  }),
  lists: z.object({
    specialties: z.array(z.string().trim().min(1).max(80)).max(100),
    resourceTypes: z.array(z.string().trim().min(1).max(60)).max(50),
    projectTypes: z.array(z.string().trim().min(1).max(60)).max(50),
    departments: z.array(z.string().trim().min(1).max(80)).max(50),
  }),
  borrow: formConfig.extend({
    requireEmail: z.boolean(),
    requirePhone: z.boolean(),
    requireReturnDate: z.boolean(),
    defaultLoanDays: z.number().int().min(1).max(120),
  }),
  visit: formConfig,
  notifications: z.object({
    enabled: z.boolean(),
    daysAhead: z.number().int().min(1).max(60),
  }),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: SiteSettings = {
  site: {
    libraryName: 'المكتبة الرقمية',
    institutionName: '',
    tagline: 'مكتبتك الرقمية... المعرفة أقرب إليك',
    logoUrl: '',
    location: '',
    workingHours: '',
    contactEmail: '',
    formsOwnerAccount: '',
  },
  lists: {
    specialties: [],
    resourceTypes: [],
    projectTypes: [],
    departments: [],
  },
  borrow: {
    mode: 'msforms',
    msFormUrl: '',
    openIn: 'newtab',
    prefill: {},
    requireEmail: false,
    requirePhone: false,
    requireReturnDate: true,
  defaultLoanDays: 14,
  },
  visit: { mode: 'msforms', msFormUrl: '', openIn: 'newtab', prefill: {} },
  notifications: { enabled: true, daysAhead: 14 },
};

function merge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== 'object' || Array.isArray(base)) return (override as T) ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) && k !== 'prefill' ? merge(b, v) : v;
  }
  return out as T;
}

/**
* Settings are cached in memory: they are read once at boot and refreshed on save,
* so every request can read them without an extra database round trip.
*/
let cache: SiteSettings | null = null;

export async function loadSettings(): Promise<SiteSettings> {
  const stored = await settingsRepo.get<Partial<SiteSettings>>('site_settings');
  const merged = merge(defaultSettings, stored ?? {});
  const parsed = settingsSchema.safeParse(merged);
  cache = parsed.success ? parsed.data : defaultSettings;
  return cache;
}

export function getSettings(): SiteSettings {
  return cache ?? defaultSettings;
}

export async function saveSettings(input: unknown): Promise<SiteSettings> {
  const data = settingsSchema.parse(input);
  await settingsRepo.set('site_settings', data);
  cache = data;
  return data;
}

/** Builds the official form link with prefilled values - the client uses the same logic */
export function buildPrefilledUrl(base: string, prefill: Record<string, string>, values: Record<string, string>): string {
  const url = new URL(base);
  for (const [field, param] of Object.entries(prefill)) {
    const v = values[field];
    if (param && v) url.searchParams.set(param, v);
  }
  return url.toString();
}
