import { useState } from 'react';
import { CheckCircle2, Eye, MapPinned, Users, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import type { ListResult, VisitResponse } from '../../lib/types';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Badge, Pagination } from '../../components/ui/Misc';
import { EmptyState, ErrorState, Spinner, Alert } from '../../components/ui/Feedback';
import { ChartCard, DonutChart, HBarChart, SERIES, SplitBar, TrendChart } from '../../components/admin/charts';
import { DataTable } from '../../components/admin/DataTable';
import { fmtDate, fmtShort } from '../../lib/format';
import { DemoDataNotice, RangePicker, useStats } from './stats-shared';

export default function VisitorsAdmin() {
  const { can } = useAuth();
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(1);
  const stats = useStats(days);
  const responses = useAsync(() => api.get<ListResult<VisitResponse>>('/admin/visit-responses', { page, pageSize: 15 }), [page]);
  const s = stats.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الزوار</h1>
          <p className="mt-1 text-sm text-ink-600">زوار الموقع ونتائج استطلاع زيارة المكتبة.</p>
        </div>
        <RangePicker value={days} onChange={setDays} />
      </div>
      <DemoDataNotice stats={s} canManage={can('settings')} />
      {stats.error && <ErrorState message={stats.error} onRetry={stats.reload} />}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <StatCard label="زوار الموقع" value={s?.overview.visitors ?? 0} icon={Users} loading={!s} />
        <StatCard label="مشاهدات الصفحات" value={s?.overview.pageViews ?? 0} icon={Eye} tone="teal" loading={!s} />
        <StatCard label="مشاركو استطلاع الزيارة" value={s?.visit.total ?? 0} icon={MapPinned} tone="petrol" loading={!s} />
        <StatCard label="نسبة من زرن المكتبة" value={`${s?.visit.visitedPct ?? 0}%`} icon={CheckCircle2} tone="green" loading={!s} />
      </div>

      {s && (
        <>
          <ChartCard title="زوار الموقع يوميًا" table={{ head: ['اليوم', 'الزوار', 'المشاهدات'], rows: s.series.daily.map((d) => [d.day, d.visitors, d.views]) }}>
            <TrendChart data={s.series.daily} xKey="day" formatX={fmtShort} series={[{ key: 'visitors', name: 'الزوار', color: SERIES.primary }]} />
          </ChartCard>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="هل زرن المكتبة؟">
              <SplitBar a={{ label: 'نعم', value: s.visit.visited }} b={{ label: 'لا', value: s.visit.notVisited }} />
              <div className="mt-6">
                <p className="mb-3 text-sm font-bold">أسباب عدم الزيارة</p>
                <DonutChart data={s.visit.reasons} centerLabel="اختيار" />
              </div>
            </ChartCard>
            <ChartCard title="الخدمات الأكثر استخدامًا" table={{ head: ['الخدمة', 'العدد'], rows: s.visit.services.map((x) => [x.label, x.value]) }}>
              <HBarChart data={s.visit.services} name="المشاركات" color={SERIES.secondary} />
            </ChartCard>
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">إجابات الاستطلاع (بدون بيانات شخصية)</h2>
        <Alert tone="info">الأسماء والاقتراحات النصية تُحفظ في نموذج المؤسسة فقط، ويظهر هنا الجزء الإحصائي من كل مشاركة.</Alert>
        {responses.error ? (
          <ErrorState message={responses.error} onRetry={responses.reload} />
        ) : responses.loading && !responses.data ? (
          <Spinner />
        ) : !responses.data?.items.length ? (
          <EmptyState icon={MapPinned} title="لا توجد مشاركات بعد" />
        ) : (
          <>
            <DataTable<VisitResponse>
              rows={responses.data.items}
              loading={responses.loading}
              columns={[
                { key: 'date', header: 'التاريخ', primary: true, render: (r) => fmtDate(r.createdAt) },
                { key: 'specialty', header: 'التخصص', render: (r) => r.specialty },
                {
                  key: 'visited', header: 'زارت المكتبة',
                  render: (r) => r.hasVisited ? <Badge tone="green" icon={CheckCircle2}>نعم{r.visitFrequency ? ` — ${r.visitFrequency}` : ''}</Badge> : <Badge tone="gray" icon={XCircle}>لا</Badge>,
                },
                { key: 'reasons', header: 'الأسباب', render: (r) => (r.reasons.length ? <span className="text-xs leading-6">{r.reasons.join('، ')}</span> : '—') },
                { key: 'service', header: 'الخدمة الأكثر استخدامًا', render: (r) => r.mainService || '—' },
              ]}
            />
            <Pagination page={page} total={responses.data.total} pageSize={responses.data.pageSize} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
