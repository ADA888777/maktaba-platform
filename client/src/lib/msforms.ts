/** أدوات روابط Microsoft Forms المعبأة مسبقًا (Pre-filled URL) */

export const MS_FORMS_HOSTS = ['forms.office.com', 'forms.microsoft.com', 'forms.cloud.microsoft', 'forms.office365.us'];

export function isMsFormsUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && MS_FORMS_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const RESERVED = new Set(['id', 'origin', 'lang', 'embed', 'wdLOR', 'sharetoken', 'fswReload', 'fsw', 'culture', 'subpage', 'topview']);

/** يستخرج معرّفات الأسئلة من رابط معبأ مسبقًا مع القيم التجريبية التي أُدخلت عند توليده */
export function parsePrefilledUrl(value: string): { base: string; params: { param: string; sample: string }[] } | null {
  if (!isMsFormsUrl(value)) return null;
  const u = new URL(value);
  const params: { param: string; sample: string }[] = [];
  u.searchParams.forEach((v, k) => {
    if (!RESERVED.has(k)) params.push({ param: k, sample: v });
  });
  params.forEach((p) => u.searchParams.delete(p.param));
  return { base: u.toString(), params };
}

export function buildPrefilledUrl(base: string, prefill: Record<string, string>, values: Record<string, string | undefined>, embed = false) {
  const u = new URL(base);
  Object.values(prefill).forEach((param) => u.searchParams.delete(param));
  u.searchParams.delete('embed');
  // ترميز صريح بـ %20 بدل + لضمان قراءة المسافات بشكل صحيح في Microsoft Forms
  const extra = Object.entries(prefill)
    .filter(([field, param]) => param && values[field])
    .map(([field, param]) => `${encodeURIComponent(param)}=${encodeURIComponent(values[field]!)}`);
  if (embed) extra.push('embed=true');
  if (!extra.length) return u.toString();
  const q = u.search ? `${u.search}&` : '?';
  return `${u.origin}${u.pathname}${q}${extra.join('&')}${u.hash}`;
}

export const BORROW_FIELD_LABELS: Record<string, string> = {
  referenceCode: 'الرمز المرجعي للطلب',
  bookTitle: 'اسم الكتاب',
  bookAuthor: 'مؤلف الكتاب',
  fullName: 'اسم الطالبة/المتدربة',
  traineeId: 'الرقم التدريبي',
  specialty: 'التخصص',
  email: 'البريد الإلكتروني',
  phone: 'رقم الجوال',
  borrowDate: 'تاريخ الاستعارة',
  returnDate: 'التاريخ المتوقع للإرجاع',
  notes: 'ملاحظات',
};

export const VISIT_FIELD_LABELS: Record<string, string> = {
  fullName: 'الاسم',
  specialty: 'التخصص',
  hasVisited: 'هل سبق لك زيارة المكتبة؟',
  visitFrequency: 'معدل الزيارة',
  reasons: 'أسباب عدم الزيارة',
  otherReason: 'سبب آخر (نص)',
  mainService: 'الخدمة الأكثر استخدامًا',
  otherService: 'خدمة أخرى (نص)',
  suggestions: 'اقتراحات',
};
