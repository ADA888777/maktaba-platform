import { Link } from 'react-router';
import {
  ArrowLeft, BookMarked, BookOpen, CalendarClock, ClipboardCheck, FolderKanban, Globe2, MousePointerClick, Plus, Users, MapPinned, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/Misc';
import { ErrorState } from '../../components/ui/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import { ChartCard, DonutChart, HBarChart, SERIES, TrendChart } from '../../components/admin/charts';
import { fmtNumber, fmtShort } from '../../lib/format';
import { DemoDataNotice, RangePicker, statusLabels, useStats } from './stats-shared';

export default function DashboardHome() {
  const { user, can } = useAuth();
  const [days, setDays] = useState('30');
  const { data, error, loading, reload } = useStats(days);
  const o = data?.overview;
  const busy = loading && !data;

  const cards = [
    { label: 'إجمالي زوار الموقع', value: o?.visitors ?? 0, icon: Users, tone: 'blue' as const, hint: o ? `${fmtNumber(o.pageViews)} مشاهدة صفحة` : undefined },
    { label: 'زيارات قسم المصادر', value: o?.resourcesVisits ?? 0, icon: Globe2, tone: 'teal' as const },
    { label: 'مرات فتح المصادر', value: o?.resourceOpens ?? 0, icon: MousePointerClick, tone: 'petrol' as const },
    { label: 'طلبات الاستعارة', value: o?.loans ?? 0, icon: BookMarked, tone: 'blue' as const },
    { label: 'الكتب المستعارة حاليًا', value: o?.borrowedCopies ?? 0, icon: BookOpen, tone: 'green' as const, hint: 'نسخ لدى المستفيدات الآن' },
    { label: 'المشاريع', value: o?.projects ?? 0, icon: FolderKanban, tone: 'teal' as const },
    { label: 'المشاريع والفعاليات القادمة', value: o?.upcomingEvents ?? 0, icon: CalendarClock, tone: 'petrol' as const },
    { label: 'المشاركات في الاستبيانات', value: o?.surveyParticipations ?? 0, icon: ClipboardCheck, tone: 'green' as const, hint: 'مرات بدء المشاركة من الموقع' },
    { label: 'مشاركات استطلاع الزيارة', value: o?.visitSurveyResponses ?? 0, icon: MapPinned, tone: 'blue' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">أهلًا، {user?.displayName}</h1>
          <p className="mt-1 text-sm text-ink-600">ملخص استخدام خدمات المكتبة في الفترة المختارة.</p>
        </div>
        <RangePicker value={days} onChange={setDays} />
      </div>

      <DemoDataNotice stats={data} canManage={can('settings')} />
      {error && <ErrorState message={error} onRetry={reload} />}

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((c) => <StatCard key={c.label} {...c} loading={busy} />)}
      </div>

      {data && data.loans.overdue > 0 && (
        <Link to="/admin/loans?overdue=true" className="flex items-center gap-3 rounded-2xl border border-warn-700/25 bg-warn-50 p-4 text-warn-700 hover:bg-warn-50/70">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">يوجد {data.loans.overdue} استعارة متأخرة عن موعد الإرجاع المتوقع</span>
          <ArrowLeft className="size-4" />
        </Link>
      )}

      {data && (
        <div className="grid gap-5 xl:grid-cols-3">
          <ChartCard
            className="xl:col-span-2"
            title="الزيارات اليومية"
            subtitle="مشاهدات الصفحات والزوار الفريدون يوميًا"
            table={{ head: ['اليوم', 'المشاهدات', 'الزوار'], rows: data.series.daily.map((d) => [d.day, d.views, d.visitors]) }}
          >
            <TrendChart
              data={data.series.daily}
              xKey="day"
              formatX={fmtShort}
              series={[
                { key: 'views', name: 'المشاهدات', color: SERIES.primary },
                { key: 'visitors', name: 'الزوار', color: SERIES.secondary },
              ]}
            />
          </ChartCard>
          <ChartCard title="حالة طلبات الاستعارة" table={{ head: ['الحالة', 'العدد'], rows: data.loans.byStatus.map((s) => [statusLabels[s.label] ?? s.label, s.value]) }}>
            <DonutChart data={data.loans.byStatus.map((s) => ({ label: statusLabels[s.label] ?? s.label, value: s.value }))} centerLabel="طلب" />
          </ChartCard>
          <ChartCard title="المصادر الأكثر استخدامًا" subtitle="حسب مرات الفتح" table={{ head: ['المصدر', 'مرات الفتح'], rows: data.resources.top.map((r) => [r.label, r.value]) }}>
            <HBarChart data={data.resources.top} name="مرات الفتح" max={6} />
          </ChartCard>
          <ChartCard title="الكتب الأكثر استعارة" table={{ head: ['الكتاب', 'الطلبات'], rows: data.books.topBorrowed.map((r) => [r.label, r.value]) }}>
            <HBarChart data={data.books.topBorrowed} name="طلبات الاستعارة" color={SERIES.secondary} max={6} />
          </ChartCard>
          <ChartCard title="أسباب عدم زيارة المكتبة" table={{ head: ['السبب', 'العدد'], rows: data.visit.reasons.map((r) => [r.label, r.value]) }}>
            <DonutChart data={data.visit.reasons} centerLabel="إجابة" />
          </ChartCard>
        </div>
      )}

      {can('content') && (
        <section className="card p-5">
          <h2 className="mb-4 text-base font-bold">إجراءات سريعة</h2>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/admin/books?new=1" variant="outline" size="sm" icon={<Plus className="size-4" />}>إضافة كتاب</ButtonLink>
            <ButtonLink to="/admin/resources?new=1" variant="outline" size="sm" icon={<Plus className="size-4" />}>إضافة مصدر إلكتروني</ButtonLink>
            <ButtonLink to="/admin/projects?new=1" variant="outline" size="sm" icon={<Plus className="size-4" />}>إضافة مشروع</ButtonLink>
            <ButtonLink to="/admin/events?new=1" variant="outline" size="sm" icon={<Plus className="size-4" />}>إضافة فعالية</ButtonLink>
            <ButtonLink to="/admin/loans" variant="outline" size="sm" icon={<BookMarked className="size-4" />}>إدارة الاستعارات</ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
