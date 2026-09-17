import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { CalendarClock, CalendarDays, History } from 'lucide-react';
import { api } from '../../lib/api';
import type { LibraryEvent, ListResult } from '../../lib/types';
import { useAsync, useNow } from '../../hooks/useAsync';
import { useUrlState } from '../../hooks/useUrlState';
import { track } from '../../lib/analytics';
import { PageHero, Pagination, Tabs } from '../../components/ui/Misc';
import { CardGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { EventCard } from '../../components/public/Cards';

export default function EventsPage() {
  const [q, setQ] = useUrlState({ scope: 'upcoming', page: '1' });
  const now = useNow(30000);
  const { hash } = useLocation();
  const list = useAsync(() => api.get<ListResult<LibraryEvent>>('/public/events', { scope: q.scope, page: q.page, pageSize: 10 }), [q.scope, q.page]);

  useEffect(() => {
    track('events_visit');
  }, []);

  // الانتقال إلى الفعالية المحددة من التنبيهات
  useEffect(() => {
    if (!hash || !list.data) return;
    const el = document.querySelector(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-teal-500');
      const t = setTimeout(() => el.classList.remove('ring-2', 'ring-teal-500'), 2500);
      return () => clearTimeout(t);
    }
  }, [hash, list.data]);

  // إذا انتهت فعالية أثناء التصفح تُزال من القادمة تلقائيًا
  const items = (list.data?.items ?? []).filter((e) => {
    if (q.scope !== 'upcoming') return true;
    const end = e.endsAt ? new Date(e.endsAt).getTime() : new Date(e.startsAt).getTime() + 7200000;
    return end >= now.getTime();
  });

  return (
    <>
      <PageHero
        icon={CalendarClock}
        eyebrow="الفعاليات"
        title="المشاريع والفعاليات"
        description="مواعيد المشاريع والفعاليات القادمة مع المدة المتبقية لكل منها. تنتقل الفعالية تلقائيًا إلى السابقة بعد انتهائها."
      />
      <section className="container-page pt-8">
        <Tabs
          value={q.scope as 'upcoming' | 'past'}
          onChange={(scope) => setQ({ scope, page: '1' })}
          items={[
            { value: 'upcoming', label: 'القادمة', icon: CalendarDays },
            { value: 'past', label: 'السابقة', icon: History },
          ]}
          className="mb-6 w-fit"
        />
        <div aria-live="polite">
          {list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : list.loading && !list.data ? (
            <CardGridSkeleton count={3} />
          ) : !items.length ? (
            <EmptyState
              icon={CalendarDays}
              title={q.scope === 'upcoming' ? 'لا توجد فعاليات قادمة حاليًا' : 'لا توجد فعاليات سابقة'}
              description={q.scope === 'upcoming' ? 'ستظهر الفعاليات الجديدة هنا فور إعلانها.' : undefined}
            />
          ) : (
            <div className="grid gap-4">
              {items.map((e) => <EventCard key={e.id} event={e} now={now} />)}
            </div>
          )}
          {list.data && <Pagination page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onChange={(p) => setQ({ page: String(p) })} />}
        </div>
      </section>
    </>
  );
}
