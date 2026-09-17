import { useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { api } from '../../lib/api';
import type { ListResult, Survey } from '../../lib/types';
import { useAsync } from '../../hooks/useAsync';
import { track } from '../../lib/analytics';
import { PageHero } from '../../components/ui/Misc';
import { CardGridSkeleton, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { SurveyCard } from '../../components/public/Cards';
import { PrivacyNote } from '../../components/public/OfficialForm';

export default function SurveysPage() {
  const list = useAsync(() => api.get<ListResult<Survey>>('/public/surveys'), []);
  useEffect(() => {
    track('surveys_visit');
  }, []);

  const active = list.data?.items.filter((s) => s.state !== 'ended') ?? [];
  const ended = list.data?.items.filter((s) => s.state === 'ended') ?? [];

  return (
    <>
      <PageHero
        icon={ClipboardList}
        eyebrow="الاستبيانات"
        title="شاركي برأيك"
        description="استبيانات قصيرة تساعد المكتبة على تطوير خدماتها ومصادرها. تُفتح المشاركة في نموذج المؤسسة الرسمي."
      />
      <section className="container-page space-y-10 pt-8">
        <div className="max-w-2xl"><PrivacyNote mode="msforms" /></div>
        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <CardGridSkeleton count={3} />
        ) : !list.data?.items.length ? (
          <EmptyState icon={ClipboardList} title="لا توجد استبيانات حاليًا" description="ستظهر الاستبيانات الجديدة هنا فور نشرها." />
        ) : (
          <>
            <div>
              <h2 className="mb-4 text-xl font-bold">الاستبيانات المتاحة</h2>
              {active.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {active.map((s) => <SurveyCard key={s.id} survey={s} />)}
                </div>
              ) : (
                <EmptyState icon={ClipboardList} title="لا توجد استبيانات مفتوحة الآن" />
              )}
            </div>
            {ended.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-bold text-ink-700">استبيانات منتهية</h2>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {ended.map((s) => <SurveyCard key={s.id} survey={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
