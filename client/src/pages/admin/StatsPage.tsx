import { useState } from 'react';
import {
  BookMarked, BookOpen, CalendarCheck, CalendarClock, CheckCircle2, ClipboardCheck, Clock, Eye, FolderKanban, Globe2, History,
  Layers, MapPinned, MousePointerClick, Users, XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Tabs } from '../../components/ui/Misc';
import { ErrorState, Spinner } from '../../components/ui/Feedback';
import { ChartCard, ColumnChart, DonutChart, HBarChart, SERIES, SplitBar, TrendChart } from '../../components/admin/charts';
import { fmtMonth, fmtShort } from '../../lib/format';
import { DemoDataNotice, RangePicker, statusLabels, useStats } from './stats-shared';
import type { DashboardStats } from '../../lib/types';
import { useUrlState } from '../../hooks/useUrlState';

type Tab = 'overview' | 'resources' | 'books' | 'loans' | 'projects' | 'surveys' | 'visit';

const tabs: { value: Tab; label: string; icon: typeof Globe2 }[] = [
  { value: 'overview', label: 'عام', icon: Eye },
  { value: 'resources', label: 'المصادر الإلكترونية', icon: Globe2 },
  { value: 'books', label: 'الكتب', icon: BookOpen },
  { value: 'loans', label: 'الاستعارة', icon: BookMarked },
  { value: 'projects', label: 'المشاريع', icon: FolderKanban },
  { value: 'surveys', label: 'الاستبيانات', icon: ClipboardCheck },
  { value: 'visit', label: 'زيارة المكتبة', icon: MapPinned },
];

const rowsOf = (list: { label: string; value: number }[]) => list.map((r) => [r.label, r.value]);

export default function StatsPage() {
  const { can } = useAuth();
  const [q, setQ] = useUrlState({ tab: 'overview', days: '30' });
  const [days, setDays] = useState(q.days);
  const { data, error, loading, reload } = useStats(days);
  const tab = q.tab as Tab;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">الإحصائيات</h1>
          <p className="mt-1 text-sm text-ink-600">إحصائيات مستقلة لكل خدمة، دون أي بيانات شخصية.</p>
        </div>
        <RangePicker value={days} onChange={(d) => { setDays(d); setQ({ days: d }); }} />
      </div>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} items={tabs} />
      <DemoDataNotice stats={data} canManage={can('settings')} />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Spinner />
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {tab === 'overview' && <Overview s={data} />}
          {tab === 'resources' && <Resources s={data} />}
          {tab === 'books' && <Books s={data} />}
          {tab === 'loans' && <Loans s={data} />}
          {tab === 'projects' && <Projects s={data} />}
          {tab === 'surveys' && <Surveys s={data} />}
          {tab === 'visit' && <Visit s={data} />}
        </div>
      )}
    </div>
  );
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">{children}</div>
);

function Overview({ s }: { s: DashboardStats }) {
  return (
    <>
      <Grid>
        <StatCard label="إجمالي الزوار" value={s.overview.visitors} icon={Users} />
        <StatCard label="مشاهدات الصفحات" value={s.overview.pageViews} icon={Eye} tone="teal" />
        <StatCard label="طلبات الاستعارة" value={s.overview.loans} icon={BookMarked} tone="petrol" />
        <StatCard label="المشاركات في الاستبيانات" value={s.overview.surveyParticipations} icon={ClipboardCheck} tone="green" />
      </Grid>
      <ChartCard title="الزيارات حسب الأيام" subtitle="آخر 90 يومًا كحد أقصى" table={{ head: ['اليوم', 'المشاهدات', 'الزوار', 'المصادر', 'الاستعارات'], rows: s.series.daily.map((d) => [d.day, d.views, d.visitors, d.resources, d.loans]) }}>
        <TrendChart data={s.series.daily} xKey="day" formatX={fmtShort} series={[{ key: 'views', name: 'المشاهدات', color: SERIES.primary }, { key: 'visitors', name: 'الزوار', color: SERIES.secondary }]} />
      </ChartCard>
      <ChartCard title="الزوار حسب الأشهر" table={{ head: ['الشهر', 'الزوار', 'المشاهدات'], rows: s.series.monthly.map((m) => [fmtMonth(m.month), m.visitors, m.views]) }}>
        <ColumnChart data={s.series.monthly} xKey="month" yKey="visitors" name="الزوار" formatX={fmtMonth} />
      </ChartCard>
    </>
  );
}

function Resources({ s }: { s: DashboardStats }) {
  const r = s.resources;
  return (
    <>
      <Grid>
        <StatCard label="زيارات قسم المصادر" value={r.visits} icon={Eye} />
        <StatCard label="مرات فتح المصادر" value={r.opens} icon={MousePointerClick} tone="teal" />
        <StatCard label="عدد المصادر" value={r.total} icon={Globe2} tone="petrol" hint={`${r.active} ظاهر في الموقع`} />
        <StatCard label="متوسط الفتح لكل زيارة" value={r.visits ? (r.opens / r.visits).toFixed(2) : '0'} icon={Layers} tone="green" />
      </Grid>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="المصادر الأكثر استخدامًا" subtitle="عدد مرات فتح كل مصدر" table={{ head: ['المصدر', 'مرات الفتح'], rows: rowsOf(r.top) }}>
          <HBarChart data={r.top} name="مرات الفتح" max={10} />
        </ChartCard>
        <ChartCard title="الاستخدام حسب نوع المصدر" table={{ head: ['النوع', 'مرات الفتح'], rows: rowsOf(r.byType) }}>
          <DonutChart data={r.byType} centerLabel="مرة فتح" />
        </ChartCard>
      </div>
      <ChartCard title="استخدام المصادر يوميًا" table={{ head: ['اليوم', 'زيارات وفتح'], rows: s.series.daily.map((d) => [d.day, d.resources]) }}>
        <TrendChart data={s.series.daily} xKey="day" formatX={fmtShort} series={[{ key: 'resources', name: 'زيارات وفتح المصادر', color: SERIES.secondary }]} />
      </ChartCard>
    </>
  );
}

function Books({ s }: { s: DashboardStats }) {
  const b = s.books;
  return (
    <>
      <Grid>
        <StatCard label="عدد الكتب" value={b.total} icon={BookOpen} hint={`${b.copiesTotal} نسخة إجمالًا`} />
        <StatCard label="كتب متاحة" value={b.titlesAvailable} icon={CheckCircle2} tone="green" />
        <StatCard label="كتب غير متاحة" value={b.titlesUnavailable} icon={XCircle} tone="gray" />
        <StatCard label="نسخ مستعارة حاليًا" value={b.copiesBorrowed} icon={BookMarked} tone="petrol" />
      </Grid>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="الكتب الأكثر استعارة" table={{ head: ['الكتاب', 'الطلبات'], rows: rowsOf(b.topBorrowed) }}>
          <HBarChart data={b.topBorrowed} name="طلبات الاستعارة" max={10} />
        </ChartCard>
        <ChartCard title="الكتب حسب التصنيف" table={{ head: ['التصنيف', 'عدد الكتب'], rows: rowsOf(b.byCategory) }}>
          <DonutChart data={b.byCategory} centerLabel="كتاب" />
        </ChartCard>
      </div>
    </>
  );
}

function Loans({ s }: { s: DashboardStats }) {
  const l = s.loans;
  const byStatus = l.byStatus.map((x) => ({ label: statusLabels[x.label] ?? x.label, value: x.value }));
  return (
    <>
      <Grid>
        <StatCard label="إجمالي طلبات الاستعارة" value={l.total} icon={BookMarked} />
        <StatCard label="فتح نموذج الاستعارة" value={l.starts} icon={MousePointerClick} tone="teal" hint={l.starts ? `نسبة الإكمال ${Math.round((l.total / l.starts) * 100)}%` : undefined} />
        <StatCard label="مستعار حاليًا" value={s.books.copiesBorrowed} icon={BookOpen} tone="petrol" />
        <StatCard label="متأخرة عن الإرجاع" value={l.overdue} icon={Clock} tone="gray" />
      </Grid>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="الاستعارات حسب الكتاب" table={{ head: ['الكتاب', 'الطلبات'], rows: rowsOf(s.books.topBorrowed) }}>
          <HBarChart data={s.books.topBorrowed} name="الطلبات" max={10} />
        </ChartCard>
        <ChartCard title="الاستعارات حسب التخصص" table={{ head: ['التخصص', 'الطلبات'], rows: rowsOf(l.bySpecialty) }}>
          <HBarChart data={l.bySpecialty} name="الطلبات" color={SERIES.secondary} max={10} />
        </ChartCard>
        <ChartCard title="الاستعارات حسب الفترة الزمنية" subtitle="شهريًا" table={{ head: ['الشهر', 'الطلبات'], rows: l.byMonth.map((m) => [fmtMonth(m.month), m.value]) }}>
          <ColumnChart data={l.byMonth} xKey="month" yKey="value" name="الطلبات" formatX={fmtMonth} />
        </ChartCard>
        <ChartCard title="حالة الطلبات" table={{ head: ['الحالة', 'العدد'], rows: rowsOf(byStatus) }}>
          <DonutChart data={byStatus} centerLabel="طلب" />
        </ChartCard>
      </div>
    </>
  );
}

function Projects({ s }: { s: DashboardStats }) {
  const p = s.projects;
  return (
    <>
      <Grid>
        <StatCard label="عدد المشاريع" value={p.total} icon={FolderKanban} />
        <StatCard label="مشاريع وفعاليات قادمة" value={p.upcomingEvents} icon={CalendarClock} tone="teal" />
        <StatCard label="فعاليات سابقة" value={p.pastEvents} icon={History} tone="gray" />
        <StatCard label="زيارات صفحتي المشاريع والفعاليات" value={p.visits + p.eventsVisits} icon={CalendarCheck} tone="green" />
      </Grid>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="المشاريع حسب التخصص" table={{ head: ['التخصص', 'المشاريع'], rows: rowsOf(p.bySpecialty) }}>
          <HBarChart data={p.bySpecialty} name="المشاريع" max={10} />
        </ChartCard>
        <ChartCard title="المشاريع حسب النوع" table={{ head: ['النوع', 'المشاريع'], rows: rowsOf(p.byType) }}>
          <DonutChart data={p.byType} centerLabel="مشروع" />
        </ChartCard>
      </div>
    </>
  );
}

function Surveys({ s }: { s: DashboardStats }) {
  const v = s.surveys;
  return (
    <>
      <Grid>
        <StatCard label="عدد الاستبيانات" value={v.total} icon={ClipboardCheck} hint={`${v.active} مفتوح حاليًا`} />
        <StatCard label="المشاركات من الموقع" value={v.participations} icon={MousePointerClick} tone="teal" hint="مرات الضغط على «المشاركة»" />
        <StatCard label="الردود المسجلة في Forms" value={v.reportedResponses} icon={CheckCircle2} tone="green" hint="تُدخل يدويًا من صفحة الاستبيان" />
        <StatCard label="زيارات صفحة الاستبيانات" value={v.visits} icon={Eye} tone="petrol" />
      </Grid>
      <ChartCard
        title="المشاركات حسب الاستبيان"
        table={{ head: ['الاستبيان', 'المشاركات من الموقع', 'الردود في Forms'], rows: v.bySurvey.map((x) => [x.label, x.value, x.reported ?? '—']) }}
      >
        <HBarChart data={v.bySurvey} name="المشاركات" max={10} />
      </ChartCard>
    </>
  );
}

function Visit({ s }: { s: DashboardStats }) {
  const v = s.visit;
  return (
    <>
      <Grid>
        <StatCard label="عدد المشاركات" value={v.total} icon={Users} />
        <StatCard label="زرن المكتبة" value={`${v.visitedPct}%`} icon={CheckCircle2} tone="green" hint={`${v.visited} مشاركة`} />
        <StatCard label="لم يزرن المكتبة" value={`${v.notVisitedPct}%`} icon={XCircle} tone="gray" hint={`${v.notVisited} مشاركة`} />
        <StatCard label="زيارات صفحة الاستطلاع" value={v.pageVisits} icon={Eye} tone="teal" />
      </Grid>
      <ChartCard title="نسبة زيارة المكتبة">
        <SplitBar a={{ label: 'زرن المكتبة', value: v.visited }} b={{ label: 'لم يزرنها', value: v.notVisited }} />
      </ChartCard>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="أسباب عدم الزيارة" subtitle="يمكن اختيار أكثر من سبب" table={{ head: ['السبب', 'العدد'], rows: rowsOf(v.reasons) }}>
          <DonutChart data={v.reasons} centerLabel="اختيار" />
        </ChartCard>
        <ChartCard title="الخدمات الأكثر استخدامًا" table={{ head: ['الخدمة', 'العدد'], rows: rowsOf(v.services) }}>
          <HBarChart data={v.services} name="المشاركات" color={SERIES.secondary} />
        </ChartCard>
      </div>
      <ChartCard title="المشاركات حسب التخصص" table={{ head: ['التخصص', 'المشاركات'], rows: rowsOf(v.bySpecialty) }}>
        <HBarChart data={v.bySpecialty} name="المشاركات" max={12} />
      </ChartCard>
    </>
  );
}
