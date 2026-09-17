import { CalendarDays, CheckCircle2, Clock, ExternalLink, FileText, MapPin, Paperclip, Users, XCircle, Building2, BookMarked } from 'lucide-react';
import type { Book, ElectronicResource, LibraryEvent, Project, Survey } from '../../lib/types';
import { Badge } from '../ui/Misc';
import { Button, ButtonLink, ExternalButton } from '../ui/Button';
import { BookCover } from './BookCover';
import { resourceIcons } from './icons';
import { countdownText, fmtDate, fmtDayMonth, fmtTime, fmtWeekday } from '../../lib/format';
import { track } from '../../lib/analytics';

export function BookCard({ book }: { book: Book }) {
  const available = book.copiesAvailable > 0;
  return (
    <article className="card group flex flex-col overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex gap-4 p-4">
        <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl shadow-md">
          <BookCover title={book.title} author={book.author} coverUrl={book.coverUrl} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap gap-1.5">
            {available ? (
              <Badge tone="green" icon={CheckCircle2}>متاح</Badge>
            ) : (
              <Badge tone="gray" icon={XCircle}>غير متاح</Badge>
            )}
            {book.categoryName && <Badge tone="blue">{book.categoryName}</Badge>}
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-base leading-7 font-bold">{book.title}</h3>
          {book.author && <p className="mt-0.5 text-sm text-ink-600">{book.author}</p>}
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-600">{book.description}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3">
        <span className="text-xs text-ink-500">
          {available ? `النسخ المتاحة: ${book.copiesAvailable} من ${book.copiesTotal}` : 'جميع النسخ مستعارة حاليًا'}
        </span>
        {available ? (
          <ButtonLink to={`/borrow/${book.id}`} size="sm" variant="primary" icon={<BookMarked className="size-4" />}>
            استعارة الكتاب
          </ButtonLink>
        ) : (
          <Button size="sm" variant="outline" disabled>
            غير متاح حاليًا
          </Button>
        )}
      </div>
    </article>
  );
}

export function ResourceCard({ resource }: { resource: ElectronicResource }) {
  const Icon = resourceIcons[resource.icon] ?? resourceIcons.globe;
  let host = '';
  try {
    host = new URL(resource.url).hostname.replace(/^www\./, '');
  } catch {
    /* رابط غير صالح */
  }
  return (
    <article className="card group flex flex-col p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start gap-3.5">
        {resource.imageUrl ? (
          <img src={resource.imageUrl} alt="" className="size-14 shrink-0 rounded-2xl border border-ink-100 object-cover" />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-800 to-teal-600 text-white shadow-sm">
            <Icon className="size-7" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base leading-7 font-bold">{resource.name}</h3>
          <p className="ltr truncate text-xs text-ink-500" dir="ltr">{host}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-ink-600">{resource.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {resource.resourceType && <Badge tone="teal">{resource.resourceType}</Badge>}
        {resource.categoryName && <Badge tone="blue">{resource.categoryName}</Badge>}
        <Badge tone="gray">{resource.specialty || 'جميع التخصصات'}</Badge>
      </div>
      <ExternalButton
        href={resource.url}
        variant="outline"
        className="mt-5 w-full group-hover:border-brand-500 group-hover:text-brand-800"
        icon={<ExternalLink className="size-4" />}
        onClick={() => track('resource_open', { targetId: resource.id })}
        aria-label={`فتح المصدر: ${resource.name} (يفتح في نافذة جديدة)`}
      >
        فتح المصدر
      </ExternalButton>
    </article>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      {project.imageUrl ? (
        <img src={project.imageUrl} alt={project.title} loading="lazy" className="h-44 w-full object-cover" />
      ) : (
        <div className="brand-gradient hero-pattern flex h-28 items-end p-4">
          <Badge tone="white">{project.projectType || 'مشروع'}</Badge>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {project.imageUrl && project.projectType && <div className="mb-2"><Badge tone="teal">{project.projectType}</Badge></div>}
        <h3 className="text-base leading-7 font-bold">{project.title}</h3>
        {project.topic && <p className="mt-0.5 text-sm font-medium text-teal-700">{project.topic}</p>}
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-600">{project.description}</p>
        <dl className="mt-4 space-y-1.5 text-xs text-ink-600">
          {project.specialty && (
            <div className="flex items-center gap-1.5"><Building2 className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">التخصص</dt><dd>{project.specialty}</dd></div>
          )}
          {project.showTeam && project.teamName && (
            <div className="flex items-center gap-1.5"><Users className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">الفريق</dt><dd>{project.teamName}</dd></div>
          )}
          {project.projectDate && (
            <div className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-ink-400" aria-hidden /><dt className="sr-only">التاريخ</dt><dd>{fmtDate(project.projectDate)}</dd></div>
          )}
        </dl>
        {project.fileUrl && (
          <ExternalButton href={project.fileUrl} variant="secondary" size="sm" className="mt-4 self-start" icon={<Paperclip className="size-4" />}>
            عرض ملف المشروع
          </ExternalButton>
        )}
      </div>
    </article>
  );
}

const countdownTones = {
  live: 'bg-leaf-600 text-white',
  soon: 'bg-teal-600 text-white',
  near: 'bg-brand-700 text-white',
  far: 'bg-brand-50 text-brand-800',
  past: 'bg-ink-100 text-ink-600',
};

export function CountdownBadge({ event, now }: { event: LibraryEvent; now: Date }) {
  if (event.status === 'cancelled') return <Badge tone="red">ملغاة</Badge>;
  const c = countdownText(event.startsAt, event.endsAt, now);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${countdownTones[c.tone]}`}>
      <Clock className="size-3.5" aria-hidden />
      {c.text}
    </span>
  );
}

const statusBadge = {
  scheduled: null,
  postponed: <Badge tone="amber">مؤجلة</Badge>,
  cancelled: <Badge tone="red">ملغاة</Badge>,
};

export function EventCard({ event, now, compact = false }: { event: LibraryEvent; now: Date; compact?: boolean }) {
  const past = countdownText(event.startsAt, event.endsAt, now).tone === 'past';
  return (
    <article id={`event-${event.id}`} className={`card flex scroll-mt-28 flex-col overflow-hidden sm:flex-row ${past ? 'opacity-90' : ''}`}>
      <div className={`flex shrink-0 flex-row items-center justify-between gap-3 p-4 text-white sm:w-40 sm:flex-col sm:justify-center sm:text-center ${past ? 'bg-ink-500' : 'brand-gradient'}`}>
        <div>
          <p className="text-sm text-white/80">{fmtWeekday(event.startsAt)}</p>
          <p className="text-xl font-bold sm:mt-1 sm:text-2xl">{fmtDayMonth(event.startsAt)}</p>
        </div>
        <p className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{fmtTime(event.startsAt)}</p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {!past && event.status !== 'cancelled' && <CountdownBadge event={event} now={now} />}
          {past && <Badge tone="gray">فعالية سابقة</Badge>}
          {statusBadge[event.status]}
          {event.department && <Badge tone="blue">{event.department}</Badge>}
        </div>
        <h3 className="mt-3 text-lg leading-8 font-bold">{event.title}</h3>
        {!compact && event.description && <p className="mt-1.5 text-sm leading-7 text-ink-600">{event.description}</p>}
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-teal-700" aria-hidden />
            <dt className="sr-only">التاريخ</dt>
            <dd>{fmtWeekday(event.startsAt)} {fmtDate(event.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-4 text-teal-700" aria-hidden />
            <dt className="sr-only">الوقت</dt>
            <dd>
              {fmtTime(event.startsAt)}
              {event.endsAt && ` — ${fmtTime(event.endsAt)}`}
            </dd>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4 text-teal-700" aria-hidden />
              <dt className="sr-only">المكان</dt>
              <dd>{event.location}</dd>
            </div>
          )}
        </dl>
      </div>
      {event.imageUrl && !compact && (
        <img src={event.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover sm:h-auto sm:w-56" />
      )}
    </article>
  );
}

const surveyStates = {
  active: <Badge tone="green" dot>متاح للمشاركة</Badge>,
  upcoming: <Badge tone="blue" dot>يبدأ قريبًا</Badge>,
  ended: <Badge tone="gray">انتهى</Badge>,
};

export function SurveyCard({ survey }: { survey: Survey }) {
  const canJoin = survey.state === 'active' && Boolean(survey.formUrl);
  return (
    <article className="card flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700">
          <FileText className="size-6" aria-hidden />
        </div>
        {surveyStates[survey.state]}
      </div>
      <h3 className="mt-4 text-lg leading-8 font-bold">{survey.title}</h3>
      <p className="mt-1.5 text-sm leading-7 text-ink-600">{survey.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-ink-50 p-3 text-sm">
        <div>
          <dt className="text-xs text-ink-500">تاريخ البداية</dt>
          <dd className="font-semibold text-ink-800">{fmtDate(survey.startDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">تاريخ النهاية</dt>
          <dd className="font-semibold text-ink-800">{fmtDate(survey.endDate)}</dd>
        </div>
      </dl>
      <div className="mt-5">
        {canJoin ? (
          <ExternalButton
            href={survey.formUrl}
            variant="gradient"
            className="w-full"
            icon={<ExternalLink className="size-4" />}
            onClick={() => track('survey_open', { targetId: survey.id })}
          >
            المشاركة في الاستبيان
          </ExternalButton>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            {survey.state === 'ended' ? 'انتهت فترة المشاركة' : survey.state === 'upcoming' ? 'لم تبدأ المشاركة بعد' : 'رابط المشاركة قيد الإعداد'}
          </Button>
        )}
        {survey.state === 'active' && !survey.formUrl && (
          <p className="mt-2 text-center text-xs text-ink-500">سيُتاح زر المشاركة فور ربط الاستبيان بنموذج المؤسسة.</p>
        )}
      </div>
    </article>
  );
}
