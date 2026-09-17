import { useState } from 'react';
import { Link } from 'react-router';
import { Megaphone, X } from 'lucide-react';
import { useUpcomingNotifications } from '../../hooks/useNotifications';
import { useNow } from '../../hooks/useAsync';
import { calendarDaysUntil, countdownText, daysText } from '../../lib/format';

const KEY = 'lib_dismissed_events';
const readDismissed = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
};

/** شريط تنبيه بأقرب فعالية قادمة، والمدة محسوبة من تاريخ ووقت الفعالية */
export function AnnouncementBar() {
  const { items } = useUpcomingNotifications();
  const now = useNow(30000);
  const [dismissed, setDismissed] = useState<number[]>(readDismissed);

  const next = items.find((e) => !dismissed.includes(e.id) && countdownText(e.startsAt, e.endsAt, now).tone !== 'past');
  if (!next) return null;
  const c = countdownText(next.startsAt, next.endsAt, now);
  const days = calendarDaysUntil(next.startsAt, now);
  const lead =
    c.tone === 'live'
      ? 'فعالية جارية الآن:'
      : days === 1
        ? 'فعالية قادمة غدًا:'
        : days <= 0
          ? `فعالية اليوم (${c.text.replace('اليوم — ', '')}):`
          : `متبقي ${daysText(days)} على إقامة`;

  const dismiss = () => {
    const list = [...dismissed, next.id];
    setDismissed(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-30)));
    } catch {
      /* تجاهل */
    }
  };

  return (
    <div className="border-b border-teal-300/40 bg-teal-50 text-teal-800">
      <div className="container-page flex items-center gap-3 py-2">
        <Megaphone className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-bold">{lead}</span> {next.title}
        </p>
        <Link to={`/events#event-${next.id}`} className="shrink-0 text-sm font-bold underline-offset-4 hover:underline">
          التفاصيل
        </Link>
        <button onClick={dismiss} className="shrink-0 rounded-lg p-1 hover:bg-teal-100" aria-label="إخفاء التنبيه">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
