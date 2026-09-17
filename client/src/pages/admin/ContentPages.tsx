import { BookOpen, CalendarClock, ClipboardList, ExternalLink, FolderKanban, Globe2 } from 'lucide-react';
import { api } from '../../lib/api';
import type { Book, Category, ElectronicResource, LibraryEvent, Project, Survey } from '../../lib/types';
import { useAsync } from '../../hooks/useAsync';
import { useConfig } from '../../context/ConfigContext';
import { EntityManager } from '../../components/admin/EntityManager';
import { Badge } from '../../components/ui/Misc';
import { Alert } from '../../components/ui/Feedback';
import { BookCover } from '../../components/public/BookCover';
import { countdownText, fmtDate, fmtTime, todayISO } from '../../lib/format';
import { isMsFormsUrl } from '../../lib/msforms';
import type { Values } from '../../components/admin/FormFields';

const useCategories = (kind: Category['kind']) =>
  useAsync(() => api.get<Category[]>('/admin/categories', { kind }), [kind]).data?.map((c) => ({ value: String(c.id), label: c.name })) ?? [];

const nullIfEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);
const published = (v: boolean, on = 'منشور', off = 'مخفي') => <Badge tone={v ? 'green' : 'gray'} dot>{v ? on : off}</Badge>;
const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

/* ───────────── الكتب ───────────── */
export function BooksAdmin() {
  const { config } = useConfig();
  const categories = useCategories('book');
  return (
    <EntityManager<Book>
      endpoint="/admin/books"
      title="الكتب"
      singular="كتاب"
      icon={BookOpen}
      searchPlaceholder="ابحثي باسم الكتاب أو المؤلف..."
      rowTitle={(b) => b.title}
      filters={[
        { name: 'categoryId', label: 'التصنيف', options: categories },
        { name: 'isActive', label: 'الظهور', options: [{ value: 'true', label: 'ظاهر' }, { value: 'false', label: 'مخفي' }] },
      ]}
      columns={[
        {
          key: 'title', header: 'الكتاب', primary: true,
          render: (b) => (
            <div className="flex items-center gap-3">
              <div className="hidden h-14 w-10 shrink-0 overflow-hidden rounded-md md:block"><BookCover title={b.title} coverUrl={b.coverUrl} className="!p-1 [&>span]:hidden" /></div>
              <div className="min-w-0">
                <p className="font-bold text-ink-900">{b.title}</p>
                <p className="text-xs text-ink-500">{b.author}</p>
              </div>
            </div>
          ),
        },
        { key: 'category', header: 'التصنيف', render: (b) => b.categoryName ?? '—' },
        {
          key: 'copies', header: 'النسخ (المتاح/الإجمالي)',
          render: (b) => <span className="tabular-nums"><strong>{b.copiesAvailable}</strong> / {b.copiesTotal}</span>,
        },
        { key: 'status', header: 'الحالة', render: (b) => <Badge tone={b.copiesAvailable > 0 ? 'green' : 'gray'}>{b.copiesAvailable > 0 ? 'متاح' : 'غير متاح'}</Badge> },
        { key: 'active', header: 'الظهور', render: (b) => published(b.isActive, 'ظاهر', 'مخفي') },
      ]}
      emptyValues={{ title: '', author: '', categoryId: '', specialty: '', description: '', coverUrl: '', publisher: '', publishedYear: '', copiesTotal: 1, copiesAvailable: 1, isActive: true }}
      toForm={(b) => ({ ...b, categoryId: b.categoryId ? String(b.categoryId) : '', publishedYear: b.publishedYear ?? '' })}
      fromForm={(v) => ({ ...v, categoryId: nullIfEmpty(v.categoryId), publishedYear: nullIfEmpty(v.publishedYear), copiesTotal: Number(v.copiesTotal), copiesAvailable: Number(v.copiesAvailable) })}
      validate={(v) => ({
        title: String(v.title ?? '').trim() ? '' : 'اسم الكتاب مطلوب',
        copiesTotal: Number(v.copiesTotal) >= 0 && v.copiesTotal !== '' ? '' : 'أدخلي عددًا صحيحًا',
        copiesAvailable: Number(v.copiesAvailable) > Number(v.copiesTotal) ? 'لا يمكن أن يتجاوز الإجمالي' : v.copiesAvailable === '' ? 'مطلوب' : '',
      })}
      fields={[
        { name: 'title', label: 'اسم الكتاب', type: 'text', required: true, span: 2 },
        { name: 'author', label: 'المؤلف', type: 'text' },
        { name: 'publisher', label: 'الناشر', type: 'text' },
        { name: 'categoryId', label: 'التصنيف', type: 'select', options: categories, hint: 'تُدار التصنيفات من الإعدادات' },
        { name: 'specialty', label: 'التخصص المرتبط', type: 'select', options: config?.lists.specialties ?? [], placeholder: 'عام' },
        { name: 'copiesTotal', label: 'إجمالي النسخ', type: 'number', required: true, min: 0 },
        { name: 'copiesAvailable', label: 'النسخ المتاحة', type: 'number', required: true, min: 0, hint: 'يتحدث تلقائيًا عند تسليم وإرجاع الاستعارات' },
        { name: 'publishedYear', label: 'سنة النشر', type: 'number' },
        { name: 'coverUrl', label: 'صورة الغلاف', type: 'upload', accept: 'image' },
        { name: 'description', label: 'وصف مختصر', type: 'textarea', span: 2, maxLength: 2000 },
        { name: 'isActive', label: 'إظهار الكتاب في الموقع', type: 'toggle', span: 2 },
      ]}
    />
  );
}

/* ───────────── المصادر الإلكترونية ───────────── */
export function ResourcesAdmin() {
  const { config } = useConfig();
  const categories = useCategories('resource');
  return (
    <EntityManager<ElectronicResource>
      endpoint="/admin/resources"
      title="المصادر الإلكترونية"
      singular="مصدر"
      icon={Globe2}
      searchPlaceholder="ابحثي باسم المصدر..."
      rowTitle={(r) => r.name}
      filters={[
        { name: 'resourceType', label: 'النوع', options: config?.lists.resourceTypes ?? [] },
        { name: 'specialty', label: 'التخصص', options: config?.lists.specialties ?? [] },
        { name: 'categoryId', label: 'التصنيف', options: categories },
      ]}
      columns={[
        {
          key: 'name', header: 'المصدر', primary: true,
          render: (r) => (
            <div className="min-w-0">
              <p className="font-bold text-ink-900">{r.name}</p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                {truncate(r.url.replace(/^https?:\/\//, ''), 40)} <ExternalLink className="size-3" />
              </a>
            </div>
          ),
        },
        { key: 'type', header: 'النوع', render: (r) => r.resourceType || '—' },
        { key: 'specialty', header: 'التخصص', render: (r) => r.specialty || 'عام' },
        { key: 'category', header: 'التصنيف', render: (r) => r.categoryName ?? '—', hideOnMobile: true },
        { key: 'active', header: 'الظهور', render: (r) => published(r.isActive, 'ظاهر', 'مخفي') },
      ]}
      emptyValues={{ name: '', description: '', resourceType: '', specialty: '', categoryId: '', url: '', icon: 'globe', imageUrl: '', isActive: true }}
      toForm={(r) => ({ ...r, categoryId: r.categoryId ? String(r.categoryId) : '' })}
      fromForm={(v) => ({ ...v, categoryId: nullIfEmpty(v.categoryId) })}
      validate={(v) => ({
        name: String(v.name ?? '').trim() ? '' : 'اسم المصدر مطلوب',
        url: /^https?:\/\/\S+$/i.test(String(v.url ?? '')) ? '' : 'أدخلي رابطًا صحيحًا يبدأ بـ https://',
      })}
      fields={[
        { name: 'name', label: 'اسم المصدر', type: 'text', required: true },
        { name: 'url', label: 'رابط المصدر', type: 'url', required: true },
        { name: 'resourceType', label: 'نوع المصدر', type: 'select', options: config?.lists.resourceTypes ?? [] },
        { name: 'specialty', label: 'التخصص', type: 'select', options: config?.lists.specialties ?? [], placeholder: 'جميع التخصصات' },
        { name: 'categoryId', label: 'التصنيف', type: 'select', options: categories },
        { name: 'imageUrl', label: 'صورة/شعار المصدر', type: 'upload', accept: 'image', hint: 'اختياري — تظهر الأيقونة عند عدم وجود صورة' },
        { name: 'icon', label: 'الأيقونة', type: 'icon', span: 2 },
        { name: 'description', label: 'الوصف', type: 'textarea', span: 2, maxLength: 1500 },
        { name: 'isActive', label: 'إظهار المصدر في الموقع', type: 'toggle', span: 2 },
      ]}
    />
  );
}

/* ───────────── المشاريع ───────────── */
export function ProjectsAdmin() {
  const { config } = useConfig();
  const categories = useCategories('project');
  return (
    <EntityManager<Project>
      endpoint="/admin/projects"
      title="المشاريع"
      singular="مشروع"
      icon={FolderKanban}
      searchPlaceholder="ابحثي باسم المشروع أو موضوعه..."
      rowTitle={(p) => p.title}
      filters={[
        { name: 'specialty', label: 'التخصص', options: config?.lists.specialties ?? [] },
        { name: 'projectType', label: 'النوع', options: config?.lists.projectTypes ?? [] },
      ]}
      columns={[
        { key: 'title', header: 'المشروع', primary: true, render: (p) => <div><p className="font-bold text-ink-900">{p.title}</p><p className="text-xs text-ink-500">{p.topic}</p></div> },
        { key: 'specialty', header: 'التخصص', render: (p) => p.specialty || '—' },
        { key: 'type', header: 'النوع', render: (p) => p.projectType || '—' },
        { key: 'date', header: 'التاريخ', render: (p) => fmtDate(p.projectDate) },
        { key: 'team', header: 'الفريق', hideOnMobile: true, render: (p) => (p.teamName ? `${p.teamName}${p.showTeam ? '' : ' (مخفي)'}` : '—') },
        { key: 'pub', header: 'النشر', render: (p) => published(p.isPublished) },
      ]}
      emptyValues={{ title: '', teamName: '', showTeam: false, specialty: '', topic: '', description: '', projectDate: todayISO(), projectType: '', categoryId: '', imageUrl: '', fileUrl: '', isPublished: true }}
      toForm={(p) => ({ ...p, categoryId: p.categoryId ? String(p.categoryId) : '', projectDate: p.projectDate ?? '' })}
      fromForm={(v) => ({ ...v, categoryId: nullIfEmpty(v.categoryId), projectDate: nullIfEmpty(v.projectDate) })}
      validate={(v) => ({ title: String(v.title ?? '').trim() ? '' : 'اسم المشروع مطلوب' })}
      intro={<Alert tone="info">لا تُعرض أسماء الطالبات أو الفرق إلا إذا فعّلتِ خيار «السماح بعرض اسم الفريق» بعد أخذ الإذن.</Alert>}
      fields={[
        { name: 'title', label: 'اسم المشروع', type: 'text', required: true, span: 2 },
        { name: 'topic', label: 'موضوع المشروع', type: 'text' },
        { name: 'projectType', label: 'نوع المشروع', type: 'select', options: config?.lists.projectTypes ?? [] },
        { name: 'specialty', label: 'التخصص', type: 'select', options: config?.lists.specialties ?? [] },
        { name: 'categoryId', label: 'التصنيف', type: 'select', options: categories },
        { name: 'projectDate', label: 'تاريخ المشروع', type: 'date' },
        { name: 'teamName', label: 'اسم الطالبة / الفريق', type: 'text' },
        { name: 'showTeam', label: 'السماح بعرض اسم الفريق في الموقع', type: 'toggle', description: 'فعّليه فقط بعد موافقة صاحبات المشروع', span: 2 },
        { name: 'imageUrl', label: 'صورة المشروع', type: 'upload', accept: 'image' },
        { name: 'fileUrl', label: 'ملف المشروع', type: 'upload', accept: 'file' },
        { name: 'description', label: 'وصف مختصر', type: 'textarea', span: 2, maxLength: 2000 },
        { name: 'isPublished', label: 'نشر المشروع في الموقع', type: 'toggle', span: 2 },
      ]}
    />
  );
}

/* ───────────── الفعاليات ───────────── */
type AdminEvent = LibraryEvent;
const phaseBadge = (e: AdminEvent) => {
  if (e.status === 'cancelled') return <Badge tone="red">ملغاة</Badge>;
  const c = countdownText(e.startsAt, e.endsAt);
  if (c.tone === 'past') return <Badge tone="gray">سابقة</Badge>;
  if (c.tone === 'live') return <Badge tone="green" dot>جارية</Badge>;
  return <Badge tone="teal">{c.text}</Badge>;
};

export function EventsAdmin() {
  const { config } = useConfig();
  return (
    <EntityManager<AdminEvent>
      endpoint="/admin/events"
      title="المشاريع والفعاليات القادمة"
      singular="فعالية"
      icon={CalendarClock}
      searchPlaceholder="ابحثي بعنوان الفعالية أو المكان..."
      rowTitle={(e) => e.title}
      filters={[
        { name: 'status', label: 'الحالة', options: [{ value: 'scheduled', label: 'مجدولة' }, { value: 'postponed', label: 'مؤجلة' }, { value: 'cancelled', label: 'ملغاة' }] },
        { name: 'department', label: 'الجهة', options: config?.lists.departments ?? [] },
      ]}
      intro={<Alert tone="info">تنتقل الفعالية تلقائيًا إلى «السابقة» بعد وقت انتهائها (أو بعد ساعتين من بدايتها إن لم يُحدد وقت انتهاء)، ويُحسب التنبيه للزائرات من التاريخ والوقت مباشرة.</Alert>}
      columns={[
        { key: 'title', header: 'الفعالية', primary: true, render: (e) => <div><p className="font-bold text-ink-900">{e.title}</p><p className="text-xs text-ink-500">{e.location}</p></div> },
        { key: 'date', header: 'الموعد', render: (e) => <span>{fmtDate(e.startsAt)}<br /><span className="text-xs text-ink-500">{fmtTime(e.startsAt)}</span></span> },
        { key: 'dept', header: 'الجهة', render: (e) => e.department || '—', hideOnMobile: true },
        { key: 'phase', header: 'الحالة', render: phaseBadge },
        { key: 'pub', header: 'النشر', render: (e) => published(e.isPublished) },
      ]}
      emptyValues={{ title: '', description: '', startsAt: '', endsAt: '', location: '', department: '', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true }}
      toForm={(e) => ({ ...e, endsAt: e.endsAt ?? '' })}
      fromForm={(v: Values) => ({ ...v, endsAt: nullIfEmpty(v.endsAt), phase: undefined })}
      validate={(v) => ({
        title: String(v.title ?? '').trim() ? '' : 'عنوان الفعالية مطلوب',
        startsAt: v.startsAt ? '' : 'حددي تاريخ ووقت البداية',
        endsAt: v.endsAt && v.startsAt && String(v.endsAt) <= String(v.startsAt) ? 'وقت الانتهاء يجب أن يكون بعد البداية' : '',
      })}
      fields={[
        { name: 'title', label: 'عنوان المشروع / الفعالية', type: 'text', required: true, span: 2 },
        { name: 'startsAt', label: 'تاريخ ووقت البداية', type: 'datetime', required: true },
        { name: 'endsAt', label: 'تاريخ ووقت الانتهاء', type: 'datetime' },
        { name: 'location', label: 'المكان', type: 'text', placeholder: 'مثال: قاعة التدريب' },
        { name: 'department', label: 'الجهة أو القسم', type: 'select', options: config?.lists.departments ?? [] },
        {
          name: 'status', label: 'حالة الفعالية', type: 'select', required: true, placeholder: null,
          options: [{ value: 'scheduled', label: 'مجدولة' }, { value: 'postponed', label: 'مؤجلة' }, { value: 'cancelled', label: 'ملغاة' }],
        },
        { name: 'imageUrl', label: 'صورة الفعالية', type: 'upload', accept: 'image' },
        { name: 'description', label: 'الوصف', type: 'textarea', span: 2 },
        { name: 'isPublished', label: 'نشر الفعالية في الموقع', type: 'toggle', span: 2 },
      ]}
    />
  );
}

/* ───────────── الاستبيانات ───────────── */
export function SurveysAdmin() {
  const stateBadge = { active: <Badge tone="green" dot>مفتوح</Badge>, upcoming: <Badge tone="blue">لم يبدأ</Badge>, ended: <Badge tone="gray">منتهٍ</Badge> };
  return (
    <EntityManager<Survey>
      endpoint="/admin/surveys"
      title="الاستبيانات"
      singular="استبيان"
      icon={ClipboardList}
      rowTitle={(s) => s.title}
      intro={
        <Alert tone="info" title="ربط الاستبيانات بحساب المؤسسة">
          أنشئي الاستبيان في Microsoft Forms باستخدام حساب المؤسسة، ثم انسخي رابط المشاركة (يبدأ بـ https://forms.office.com) والصقيه هنا. تبقى الردود في حساب المؤسسة فقط.
        </Alert>
      }
      columns={[
        { key: 'title', header: 'الاستبيان', primary: true, render: (s) => <p className="font-bold text-ink-900">{s.title}</p> },
        { key: 'period', header: 'الفترة', render: (s) => <span className="text-xs">{fmtDate(s.startDate)} ← {fmtDate(s.endDate)}</span> },
        { key: 'state', header: 'الحالة', render: (s) => stateBadge[s.state] },
        { key: 'form', header: 'نموذج المؤسسة', render: (s) => (s.formUrl ? <Badge tone="teal">مربوط</Badge> : <Badge tone="amber">غير مربوط</Badge>) },
        { key: 'responses', header: 'الردود المسجلة', hideOnMobile: true, render: (s) => (s.reportedResponses ?? '—') },
        { key: 'pub', header: 'النشر', render: (s) => published(s.isPublished) },
      ]}
      emptyValues={{ title: '', description: '', startDate: todayISO(), endDate: todayISO(14), formUrl: '', reportedResponses: '', isPublished: true }}
      toForm={(s) => ({ ...s, reportedResponses: s.reportedResponses ?? '' })}
      fromForm={(v) => ({ ...v, reportedResponses: nullIfEmpty(v.reportedResponses), state: undefined, hasForm: undefined })}
      validate={(v) => ({
        title: String(v.title ?? '').trim() ? '' : 'عنوان الاستبيان مطلوب',
        startDate: v.startDate ? '' : 'مطلوب',
        endDate: !v.endDate ? 'مطلوب' : String(v.endDate) < String(v.startDate) ? 'يجب أن يكون بعد تاريخ البداية' : '',
        formUrl: v.formUrl && !isMsFormsUrl(String(v.formUrl)) ? 'يجب أن يكون رابطًا من Microsoft Forms' : '',
      })}
      fields={[
        { name: 'title', label: 'عنوان الاستبيان', type: 'text', required: true, span: 2 },
        { name: 'startDate', label: 'تاريخ البداية', type: 'date', required: true },
        { name: 'endDate', label: 'تاريخ النهاية', type: 'date', required: true },
        { name: 'formUrl', label: 'رابط Microsoft Forms', type: 'url', span: 2, placeholder: 'https://forms.office.com/r/...', hint: 'بدون الرابط يظهر الاستبيان مع زر معطّل «قيد الإعداد»' },
        { name: 'reportedResponses', label: 'عدد الردود في Microsoft Forms', type: 'number', min: 0, hint: 'اختياري: انسخيه من صفحة الردود لعرضه في الإحصائيات' },
        { name: 'description', label: 'الوصف', type: 'textarea', span: 2 },
        { name: 'isPublished', label: 'نشر الاستبيان في الموقع', type: 'toggle', span: 2 },
      ]}
    />
  );
}
