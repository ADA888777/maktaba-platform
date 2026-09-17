import { useEffect, useState } from 'react';
import { Globe2, SearchX } from 'lucide-react';
import { api } from '../../lib/api';
import type { Category, ElectronicResource, ListResult } from '../../lib/types';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useConfig } from '../../context/ConfigContext';
import { track } from '../../lib/analytics';
import { PageHero, Pagination } from '../../components/ui/Misc';
import { SearchInput, Select } from '../../components/ui/Field';
import { CardGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { ResourceCard } from '../../components/public/Cards';
import { Button } from '../../components/ui/Button';
import { useUrlState } from '../../hooks/useUrlState';

export default function ResourcesPage() {
  const { config } = useConfig();
  const [q, setQ] = useUrlState({ search: '', specialty: '', resourceType: '', categoryId: '', page: '1' });
  const [search, setSearch] = useState(q.search);
  const debounced = useDebounced(search);

  useEffect(() => {
    track('resources_visit');
  }, []);

  useEffect(() => {
    if (debounced !== q.search) setQ({ search: debounced, page: '1' });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useAsync(() => api.get<Category[]>('/public/categories', { kind: 'resource' }), []);
  const list = useAsync(
    () => api.get<ListResult<ElectronicResource>>('/public/resources', { ...q, pageSize: 12 }),
    [q.search, q.specialty, q.resourceType, q.categoryId, q.page],
  );
  const hasFilters = Boolean(q.search || q.specialty || q.resourceType || q.categoryId);

  return (
    <>
      <PageHero
        icon={Globe2}
        eyebrow="المصادر الإلكترونية"
        title="مصادر موثوقة لدعم تعلمك وبحثك"
        description="مكتبات رقمية وقواعد بيانات ومنصات تعليمية مختارة. ابحثي بالاسم أو صفّي حسب التخصص ونوع المصدر والتصنيف."
      />
      <div className="container-page -mt-6 relative">
        <div className="card grid gap-3 p-4 sm:p-5 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <SearchInput value={search} onChange={setSearch} placeholder="ابحثي عن مصدر..." label="البحث في المصادر" />
          <Select
            aria-label="التخصص"
            value={q.specialty}
            onChange={(e) => setQ({ specialty: e.target.value, page: '1' })}
            placeholder="كل التخصصات"
            options={config?.lists.specialties ?? []}
            className="h-12"
          />
          <Select
            aria-label="نوع المصدر"
            value={q.resourceType}
            onChange={(e) => setQ({ resourceType: e.target.value, page: '1' })}
            placeholder="كل الأنواع"
            options={config?.lists.resourceTypes ?? []}
            className="h-12"
          />
          <Select
            aria-label="التصنيف"
            value={q.categoryId}
            onChange={(e) => setQ({ categoryId: e.target.value, page: '1' })}
            placeholder="كل التصنيفات"
            options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            className="h-12"
          />
        </div>
      </div>

      <section className="container-page pt-8" aria-live="polite">
        {list.data && (
          <div className="mb-4 flex items-center justify-between text-sm text-ink-600">
            <p>{list.data.total ? `${list.data.total} مصدر` : ''}</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setQ({ search: '', specialty: '', resourceType: '', categoryId: '', page: '1' }); }}>
                مسح عوامل التصفية
              </Button>
            )}
          </div>
        )}
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <CardGridSkeleton />
        ) : !list.data?.items.length ? (
          hasFilters ? (
            <EmptyState icon={SearchX} title="لا توجد نتائج مطابقة" description="جرّبي كلمات بحث أخرى أو غيّري عوامل التصفية." />
          ) : (
            <EmptyState icon={Globe2} title="لم تُضف مصادر إلكترونية بعد" description="ستظهر المصادر هنا فور إضافتها من إدارة المكتبة." />
          )
        ) : (
          <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
            {list.data.items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
        {list.data && (
          <Pagination page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onChange={(p) => setQ({ page: String(p) })} />
        )}
      </section>
    </>
  );
}
