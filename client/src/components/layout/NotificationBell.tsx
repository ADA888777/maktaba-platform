import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bell, CalendarClock, MapPin } from 'lucide-react';
import { useUpcomingNotifications } from '../../hooks/useNotifications';
import { countdownText, fmtDayMonth, fmtTime } from '../../lib/format';
import { useNow } from '../../hooks/useAsync';

export function NotificationBell() {
  const { items } = useUpcomingNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const now = useNow(30000);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const active = items.filter((e) => countdownText(e.startsAt, e.endsAt, now).tone !== 'past');

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-white hover:bg-white/10"
        aria-label={`التنبيهات${active.length ? ` (${active.length})` : ''}`}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {active.length > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4.5 items-center justify-center rounded-full bg-teal-300 text-[0.65rem] font-bold text-brand-900">
            {active.length}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[4.25rem] animate-scale-in rounded-2xl border border-ink-200 bg-white text-ink-800 shadow-[var(--shadow-lift)] sm:absolute sm:inset-x-auto sm:top-auto sm:left-0 sm:mt-2 sm:w-96">
          <div className="border-b border-ink-100 px-4 py-3">
            <p className="font-bold text-ink-900">الفعاليات القادمة</p>
            <p className="text-xs text-ink-500">تُحدَّث المدة المتبقية تلقائيًا</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {active.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-500">لا توجد فعاليات قريبة حاليًا</p>
            ) : (
              active.map((e) => {
                const c = countdownText(e.startsAt, e.endsAt, now);
                return (
                  <Link
                    key={e.id}
                    to={`/events#event-${e.id}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 rounded-xl p-2.5 hover:bg-ink-50"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <CalendarClock className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-6 text-ink-900">{e.title}</span>
                      <span className="block text-xs font-semibold text-teal-700">{c.text}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                        {fmtDayMonth(e.startsAt)} · {fmtTime(e.startsAt)}
                        {e.location && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="size-3" aria-hidden /> {e.location}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
          <Link to="/events" onClick={() => setOpen(false)} className="block border-t border-ink-100 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-ink-50">
            عرض كل الفعاليات
          </Link>
        </div>
      )}
    </div>
  );
}
