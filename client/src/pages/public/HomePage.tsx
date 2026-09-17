import { ArrowLeft, BookMarked, BookOpen, ClipboardCheck, FolderKanban, Globe2, LayoutGrid, ShieldCheck, Users, Library } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../lib/api';
import type { Book, LibraryEvent, ListResult, PublicStats } from '../../lib/types';
import { useAsync, useNow } from '../../hooks/useAsync';
import { useConfig } from '../../context/ConfigContext';
import { services } from '../../lib/services';
import { ButtonLink } from '../../components/ui/Button';
import { SectionTitle, StatCard } from '../../components/ui/Misc';
import { BookCard, EventCard } from '../../components/public/Cards';
import { CardGridSkeleton, EmptyState } from '../../components/ui/Feedback';

export default function HomePage() {
  const { config } = useConfig();
  const stats = useAsync(() => api.get<PublicStats>('/public/stats'), []);
  const events = useAsync(() => api.get<ListResult<LibraryEvent>>('/public/events', { scope: 'upcoming', pageSize: 3 }), []);
  const books = useAsync(() => api.get<ListResult<Book>>('/public/books', { status: 'available', pageSize: 3 }), []);
  const now = useNow(30000);
  const s = stats.data;

  const statCards = [
    { label: 'زيارات المنصة', value: s?.visitors ?? 0, icon: Users, tone: 'blue' as const },
    { label: 'المصادر الإلكترونية', value: s?.resources ?? 0, icon: Globe2, tone: 'teal' as const },
    { label: 'الكتب', value: s?.books ?? 0, icon: BookOpen, tone: 'petrol' as const },
    { label: 'طلبات الاستعارة', value: s?.loans ?? 0, icon: BookMarked, tone: 'blue' as const },
    { label: 'المشاريع', value: s?.projects ?? 0, icon: FolderKanban, tone: 'green' as const },
    { label: 'المشاركات في الاستبيانات', value: s?.surveyParticipations ?? 0, icon: ClipboardCheck, tone: 'teal' as const },
  ];

  return (
    <>
      {/* Hero */}
      <section className="brand-gradient hero-pattern relative overflow-hidden text-white">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full border-[40px] border-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-teal-300/10 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-teal-300 ring-1 ring-white/15">
              <Library className="size-4" aria-hidden />
              {config?.site.institutionName || 'المنصة الرقمية للمكتبة'}
            </p>
            <h1 className="mt-5 text-3xl leading-[1.35] font-bold text-white sm:text-5xl sm:leading-[1.3]">
              مكتبتك الرقمية...
              <br />
              <span className="text-teal-300">المعرفة أقرب إليك</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/85 sm:text-lg sm:leading-9">
              منصة واحدة تجمع لكِ المصادر الإلكترونية والكتب المتوفرة في المكتبة، مع طلب الاستعارة بنموذج بسيط،
              ومتابعة المشاريع والفعاليات والمشاركة في الاستبيانات.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/resources" variant="light" size="lg" icon={<Globe2 className="size-5" />}>
                استكشف المصادر الإلكترونية
              </ButtonLink>
              <ButtonLink
                to="/books"
                size="lg"
                className="bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20"
                icon={<BookOpen className="size-5" />}
              >
                استعرض الكتب
              </ButtonLink>
              <a
                href="#services"
                className="inline-flex h-13 items-center gap-2 rounded-2xl px-4 text-base font-semibold text-white/90 hover:text-white"
              >
                <LayoutGrid className="size-5" aria-hidden />
                خدمات المكتبة
              </a>
            </div>
          </div>

          <div className="hidden animate-fade-up [animation-delay:120ms] lg:block" aria-hidden>
            <div className="relative mx-auto max-w-sm">
              <div className="absolute inset-0 translate-x-6 translate-y-6 rotate-3 rounded-[2rem] bg-white/10" />
              <div className="relative rounded-[2rem] bg-white p-6 text-ink-800 shadow-2xl">
                <p className="text-sm font-bold text-ink-900">كيف أستعير كتابًا؟</p>
                <ol className="mt-4 space-y-3.5">
                  {['ابحثي عن الكتاب في صفحة الكتب', 'اضغطي «استعارة الكتاب»', 'أكملي النموذج الرسمي وأرسليه', 'استلمي الكتاب من المكتبة'].map((t, i) => (
                    <li key={t} className="flex items-center gap-3">
                      <span className="brand-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-leaf-50 p-3 text-xs leading-5 text-leaf-700">
                  <ShieldCheck className="size-4 shrink-0" />
                  لا توجد أي رسوم أو دفع إلكتروني
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* الإحصائيات */}
      <section className="container-page relative z-10 -mt-8" aria-label="إحصائيات المنصة">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((c) => (
            <StatCard key={c.label} {...c} loading={stats.loading && !s} />
          ))}
        </div>
      </section>

      {/* الخدمات */}
      <section id="services" className="container-page scroll-mt-24 pt-16 sm:pt-20" aria-labelledby="services-title">
        <SectionTitle id="services-title" title="خدمات المكتبة" description="كل ما تحتاجينه من المكتبة في مكان واحد. اختاري الخدمة للبدء." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {services.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card group flex flex-col p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <span className={`flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${s.tone}`}>
                <s.icon className="size-6" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-ink-600">{s.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-700">
                {s.cta}
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* الفعاليات القادمة */}
      <section className="container-page pt-16 sm:pt-20" aria-labelledby="events-title">
        <SectionTitle
          id="events-title"
          title="المشاريع والفعاليات القادمة"
          description="المدة المتبقية تُحسب تلقائيًا من تاريخ ووقت كل فعالية."
          action={<ButtonLink to="/events" variant="outline" size="sm">كل الفعاليات</ButtonLink>}
        />
        {events.loading && !events.data ? (
          <CardGridSkeleton count={2} />
        ) : events.data?.items.length ? (
          <div className="grid gap-4">
            {events.data.items.map((e) => (
              <EventCard key={e.id} event={e} now={now} compact />
            ))}
          </div>
        ) : (
          <EmptyState title="لا توجد فعاليات قادمة حاليًا" description="تابعي هذه الصفحة؛ ستظهر الفعاليات الجديدة هنا فور إعلانها." />
        )}
      </section>

      {/* كتب متاحة */}
      <section className="container-page pt-16 sm:pt-20" aria-labelledby="books-title">
        <SectionTitle
          id="books-title"
          title="كتب متاحة للاستعارة"
          action={<ButtonLink to="/books" variant="outline" size="sm">جميع الكتب</ButtonLink>}
        />
        {books.loading && !books.data ? (
          <CardGridSkeleton count={3} />
        ) : books.data?.items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {books.data.items.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="لا توجد كتب متاحة حاليًا" />
        )}
      </section>

      {/* شريط زيارة المكتبة */}
      <section className="container-page pt-16 sm:pt-20">
        <div className="card relative overflow-hidden p-6 sm:p-10">
          <div aria-hidden className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-l from-transparent to-teal-50" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">هل زرتِ المكتبة مؤخرًا؟</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-600 sm:text-base">
                رأيك يساعدنا على فهم احتياجاتك: سواء زرتِ المكتبة أو لم تزوريها، شاركينا السبب في دقيقة واحدة.
              </p>
            </div>
            <ButtonLink to="/visit" variant="gradient" size="lg">شاركي في استطلاع الزيارة</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
