import { useEffect, useState } from 'react';
import { CalendarDays, FolderKanban, SearchX } from 'lucide-react';
import { api } from '../../lib/api';
import type { LibraryEvent, ListResult, Project } from '../../lib/types';
import { useAsync, useDebounced, useNow } from '../../hooks/useAsync';
import { useUrlState } from '../../hooks/useUrlState';
import { useConfig } from '../../context/ConfigContext';
import { track } from '../../lib/analytics';
import { PageHero, Pagination, SectionTitle, Tabs } from '../../components/ui/Misc';
import { SearchInput, Select } from '../../components/ui/Field';
import { CardGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { EventCard, ProjectCard } from '../../components/public/Cards';
import { ButtonLink, Button } from '../../components/ui/Button';

export default function ProjectsPage() {
  const { config } = useConfig();
  const [q, setQ] = useUrlState({ tab: 'projects', search: '', specialty: '', projectType: '', page: '1' });
  const [search, setSearch] = useState(q.search);
  const debounced = useDebounced(search);
  const now = useNow(30000);

  useEffect(() => {
    track('projects_visit');
  }, []);
  useEffect(() => {
    if (debounced !== q.search) setQ({ search: debounced, page: '1' });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const upcoming = useAsync(() => api.get<ListResult<LibraryEvent>>('/public/events', { scope: 'upcoming', pageSize: 4 }), []);
  const pastEvents = useAsync(
    () => (q.tab === 'past-events' ? api.get<ListResult<LibraryEvent>>('/public/events', { scope: 'past', pageSize: 12, page: q.page }) : Promise.resolve(undefined)),
    [q.tab, q.page],
  );
  const list = useAsync(
    () =>
      q.tab === 'projects'
        ? api.get<ListResult<Project>>('/public/projects', { search: q.search, specialty: q.specialty, projectType: q.projectType, page: q.page, pageSize: 9 })
        : Promise.resolve(undefined),
    [q.tab, q.search, q.specialty, q.projectType, q.page],
  );
  const hasFilters = Boolean(q.search || q.specialty || q.projectType);

  return (
    <>
      <PageHero
        icon={FolderKanban}
        eyebrow="المشاريع"
        title="مشاريع الطالبات والفعاليات"
        description="استعرضي المشاريع المقدمة للمكتبة، وتابعي المشاريع والفعاليات القادمة بمواعيدها."
      />

      {/* القادمة */}
      <section className="container-page pt-10" aria-labelledby="upcoming-title">
        <SectionTitle
          id="upcoming-title"
          title="المشاريع والفعاليات القادمة"
          action={<ButtonLink to="/events" variant="outline" size="sm" icon={<CalendarDays className="size-4" />}>صفحة الفعاليات</ButtonLink>}
        />
        {upcoming.loading && !upcoming.data ? (
          <CardGridSkeleton count={2} />
        ) : upcoming.data?.items.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {upcoming.data.items.map((e) => <EventCard key={e.id} event={e} now={now} compact />)}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title="لا توجد مشاريع أو فعاليات قادمة" />
        )}
      </section>

      {/* السابقة */}
      <section className="container-page pt-14" aria-labelledby="past-title">
        <h2 id="past-title" className="sr-only">المشاريع السابقة</h2>
        <Tabs
          value={q.tab as 'projects' | 'past-events'}
          onChange={(tab) => setQ({ tab, page: '1' })}
          items={[
            { value: 'projects', label: 'المشاريع المقدمة للمكتبة', icon: FolderKanban },
            { value: 'past-events', label: 'الفعاليات السابقة', icon: CalendarDays },
          ]}
          className="mb-6 w-fit max-w-full"
        />

        {q.tab === 'projects' ? (
          <>
            <div className="card mb-6 grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr]">
              <SearchInput value={search} onChange={setSearch} placeholder="ابحثي باسم المشروع أو موضوعه..." label="البحث في المشاريع" />
              <Select aria-label="التخصص" value={q.specialty} onChange={(e) => setQ({ specialty: e.target.value, page: '1' })} placeholder="كل التخصصات" options={config?.lists.specialties ?? []} className="h-12" />
              <Select aria-label="نوع المشروع" value={q.projectType} onChange={(e) => setQ({ projectType: e.target.value, page: '1' })} placeholder="كل الأنواع" options={config?.lists.projectTypes ?? []} className="h-12" />
            </div>
            {hasFilters && (
              <div className="mb-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setQ({ search: '', specialty: '', projectType: '', page: '1' }); }}>
                  مسح عوامل التصفية
                </Button>
              </div>
            )}
            <div aria-live="polite">
              {list.error ? (
                <ErrorState message={list.error} onRetry={list.reload} />
              ) : list.loading && !list.data ? (
                <CardGridSkeleton tall />
              ) : !list.data?.items.length ? (
                <EmptyState icon={hasFilters ? SearchX : FolderKanban} title={hasFilters ? 'لا توجد مشاريع مطابقة' : 'لم تُضف مشاريع بعد'} />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.data.items.map((p) => <ProjectCard key={p.id} project={p} />)}
                </div>
              )}
              {list.data && <Pagination page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onChange={(p) => setQ({ page: String(p) })} />}
            </div>
          </>
        ) : (
          <div aria-live="polite">
            {pastEvents.error ? (
              <ErrorState message={pastEvents.error} onRetry={pastEvents.reload} />
            ) : pastEvents.loading && !pastEvents.data ? (
              <CardGridSkeleton count={2} />
            ) : !pastEvents.data?.items.length ? (
              <EmptyState icon={CalendarDays} title="لا توجد فعاليات سابقة" />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {pastEvents.data.items.map((e) => <EventCard key={e.id} event={e} now={now} compact />)}
              </div>
            )}
            {pastEvents.data && <Pagination page={pastEvents.data.page} total={pastEvents.data.total} pageSize={pastEvents.data.pageSize} onChange={(p) => setQ({ page: String(p) })} />}
          </div>
        )}
      </section>
    </>
  );
}
