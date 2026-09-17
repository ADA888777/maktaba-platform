const TZ = 'Asia/Riyadh';

const numberFmt = new Intl.NumberFormat('ar-SA-u-nu-latn');
export const fmtNumber = (n: number) => numberFmt.format(n);

const dateFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', timeZone: TZ });
const dayMonthFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });
const shortFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', timeZone: TZ });
const monthFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** التواريخ بصيغة YYYY-MM-DD تُعامل كتاريخ محلي دون إزاحة زمنية */
const parse = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00+03:00`) : new Date(v));

export const fmtDate = (v?: string | null) => (v ? dateFmt.format(parse(v)) : '—');
export const fmtWeekday = (v: string) => dayFmt.format(parse(v));
export const fmtDayMonth = (v: string) => dayMonthFmt.format(parse(v));
export const fmtTime = (v: string) => timeFmt.format(parse(v)).replace('ص', 'صباحًا').replace('م', 'مساءً');
export const fmtShort = (v: string) => shortFmt.format(parse(v));
export const fmtMonth = (ym: string) => monthFmt.format(new Date(`${ym}-01T00:00:00Z`));

export function todayISO(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** يوم التقويم في الرياض لتاريخ معين */
const riyadhDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/** عدد الأيام التقويمية المتبقية بين اليوم وتاريخ الفعالية (بتوقيت الرياض) */
export function calendarDaysUntil(iso: string, now = new Date()) {
  const a = Date.parse(`${riyadhDay(now)}T00:00:00Z`);
  const b = Date.parse(`${riyadhDay(new Date(iso))}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

const plural = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

export const daysText = (n: number) => plural(n, 'يوم واحد', 'يومان', 'أيام', 'يومًا');
export const hoursText = (n: number) => plural(n, 'ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة');
export const minutesText = (n: number) => plural(n, 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة');

/**
 * نص التنبيه للفعالية محسوبًا من الوقت الحالي، مثل:
 * «تبدأ خلال ساعتين» — «فعالية قادمة غدًا» — «متبقي 3 أيام»
 */
export function countdownText(startsAt: string, endsAt: string | null, now = new Date()) {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + 2 * 3600000;
  const t = now.getTime();
  if (t > end) return { text: 'انتهت', tone: 'past' as const };
  if (t >= start) return { text: 'جارية الآن', tone: 'live' as const };
  const diffMin = Math.round((start - t) / 60000);
  const days = calendarDaysUntil(startsAt, now);
  if (days === 0) {
    if (diffMin < 60) return { text: `تبدأ خلال ${minutesText(Math.max(diffMin, 1))}`, tone: 'soon' as const };
    return { text: `اليوم — تبدأ خلال ${hoursText(Math.round(diffMin / 60))}`, tone: 'soon' as const };
  }
  if (days === 1) return { text: 'غدًا', tone: 'soon' as const };
  if (days === 2) return { text: 'بعد غد — متبقي يومان', tone: 'near' as const };
  return { text: `متبقي ${daysText(days)}`, tone: days <= 7 ? ('near' as const) : ('far' as const) };
}

export const toDateTimeLocal = (iso: string | null | undefined) => {
  if (!iso) return '';
  // عرض الوقت بتوقيت الرياض داخل حقل datetime-local
  const d = new Date(new Date(iso).getTime() + 3 * 3600000);
  return d.toISOString().slice(0, 16);
};
export const fromDateTimeLocal = (v: string) => (v ? new Date(`${v}:00+03:00`).toISOString() : '');
