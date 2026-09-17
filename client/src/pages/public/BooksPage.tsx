import { useEffect, useState } from 'react';
import { BookOpen, SearchX } from 'lucide-react';
import { api } from '../../lib/api';
import type { Book, Category, ListResult } from '../../lib/types';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useUrlState } from '../../hooks/useUrlState';
import { track } from '../../lib/analytics';
import { Chips, PageHero, Pagination } from '../../components/ui/Misc';
import { SearchInput, Select } from '../../components/ui/Field';
import { CardGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { BookCard } from '../../components/public/Cards';
import { Button } from '../../components/ui/Button';

export default function BooksPage() {
  const [q, setQ] = useUrlState({ search: '', categoryId: '', status: '', page: '1' });
  const [search, setSearch] = useState(q.search);
  const debounced = useDebounced(search);

  useEffect(() => {
    track('books_visit');
  }, []);
  useEffect(() => {
    if (debounced !== q.search) setQ({ search: debounced, page: '1' });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useAsync(() => api.get<Category[]>('/public/categories', { kind: 'book' }), []);
  const list = useAsync(
    () => api.get<ListResult<Book>>('/public/books', { ...q, pageSize: 12 }),
    [q.search, q.categoryId, q.status, q.page],
  );
  const hasFilters = Boolean(q.search || q.categoryId || q.status);

  return (
    <>
      <PageHero
        icon={BookOpen}
        eyebrow="الكتب"
        title="الكتب المتوفرة في المكتبة"
        description="تعرّفي على الكتب وحالة توفرها، ثم اطلبي الاستعارة مباشرة من بطاقة الكتاب — دون أي رسوم."
      />
      <div className="container-page relative -mt-6">
        <div className="card space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
            <SearchInput value={search} onChange={setSearch} placeholder="ابحثي باسم الكتاب أو المؤلف..." label="البحث في الكتب" />
            <Select
              aria-label="الحالة"
              value={q.status}
              onChange={(e) => setQ({ status: e.target.value, page: '1' })}
              placeholder="كل الحالات"
              options={[{ value: 'available', label: 'متاح' }, { value: 'unavailable', label: 'غير متاح' }]}
              className="h-12"
            />
          </div>
          <Chips
            label="التصنيف"
            value={q.categoryId}
            onChange={(v) => setQ({ categoryId: v, page: '1' })}
            allLabel="كل التصنيفات"
            options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
          />
        </div>
      </div>

      <section className="container-page pt-8" aria-live="polite">
        {list.data && (
          <div className="mb-4 flex min-h-9 items-center justify-between text-sm text-ink-600">
            <p>{list.data.total ? `${list.data.total} كتاب` : ''}</p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setQ({ search: '', categoryId: '', status: '', page: '1' }); }}>
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
            <EmptyState icon={SearchX} title="لا توجد كتب مطابقة" description="جرّبي اسمًا آخر أو غيّري التصنيف أو الحالة." />
          ) : (
            <EmptyState icon={BookOpen} title="لا توجد كتب بعد" description="ستظهر الكتب هنا فور إضافتها من إدارة المكتبة." />
          )
        ) : (
          <div className={`grid gap-5 md:grid-cols-2 xl:grid-cols-3 transition-opacity ${list.loading ? 'opacity-60' : ''}`}>
            {list.data.items.map((b) => (
              <BookCard key={b.id} book={b} />
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
