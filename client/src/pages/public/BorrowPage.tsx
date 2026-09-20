import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowRight, BookMarked, BookOpen, CheckCircle2, ClipboardList, Search, Send } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../lib/api';
import type { Book, ListResult } from '../../lib/types';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useConfig } from '../../context/ConfigContext';
import { track } from '../../lib/analytics';
import { buildPrefilledUrl } from '../../lib/msforms';
import { todayISO } from '../../lib/format';
import { clean, focusFirstError, rules, toLatinDigits, type Errors } from '../../lib/validation';
import { PageHero, Badge } from '../../components/ui/Misc';
import { Input, SearchInput } from '../../components/ui/Field';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { BookCover } from '../../components/public/BookCover';
import {
  FormNotReady, OfficialFormStep, PrivacyNote, SinkNotice, formReadiness, openPendingWindow,
} from '../../components/public/OfficialForm';

export default function BorrowPage() {
  const { bookId } = useParams();
  return (
    <>
    <PageHero
      icon={BookMarked}
      eyebrow="الاستعارة"
      title="طلب استعارة كتاب"
      description="الاستعارة مجانية بالكامل ولا تتضمن أي عملية شراء أو دفع. اختاري الكتاب ثم أكملي نموذج الطلب."
      />
    <div className="container-page pt-8">{bookId ? <BorrowForm bookId={Number(bookId)} /> : <BookPicker />}</div>div>
    </>>
    );
}

/* ----------- choosing the book ----------- */
function BookPicker() {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const list = useAsync(
    () => api.get<ListResult<Book>>('/public/books', { search: debounced, status: 'available', pageSize: 12 }),
    [debounced],
    );
  
  const steps = [
    { icon: Search, title: 'اختاري الكتاب', text: 'من القائمة أدناه أو من صفحة الكتب.' },
    { icon: ClipboardList, title: 'أكملي النموذج', text: 'الاسم والرقم التدريبي؛ اسم الكتاب يُعبأ تلقائيًا.' },
    { icon: Send, title: 'أرسلي الطلب', text: 'يصل الطلب إلى نموذج المؤسسة الرسمي.' },
    { icon: CheckCircle2, title: 'استلمي الكتاب', text: 'من المكتبة بعد تأكيد الطلب.' },
    ];
  
  return (
    <div className="space-y-8">
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
      <li key={s.title} className="card flex items-start gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
      <s.icon className="size-5" aria-hidden />
      </span>span>
      <div>
      <p className="text-sm font-bold text-ink-900">{i + 1}. {s.title}</p>p>
      <p className="mt-0.5 text-xs leading-5 text-ink-600">{s.text}</p>p>
      </div>div>
      </li>li>
      ))}
    </ol>ol>
    
    <div className="card p-4 sm:p-6">
    <h2 className="text-lg font-bold">اختاري الكتاب المراد استعارته</h2>h2>
    <p className="mt-1 text-sm text-ink-600">تظهر هنا الكتب المتاحة للاستعارة فقط.</p>p>
    <SearchInput className="mt-4" value={search} onChange={setSearch} placeholder="ابحثي باسم الكتاب أو المؤلف..." />
    <div className="mt-5" aria-live="polite">
      {list.error ? (
      <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
      <Spinner />
      ) : !list.data?.items.length ? (
      <EmptyState icon={BookOpen} title={debounced ? 'لا توجد كتب متاحة بهذا الاسم' : 'لا توجد كتب متاحة حاليًا'} action={<ButtonLink to="/books" variant="outline">عرض جميع الكتب</ButtonLink>ButtonLink>} />
      ) : (
      <ul className="grid gap-3 md:grid-cols-2">
        {list.data.items.map((b) => (
        <li key={b.id}>
        <Link
          to={`/borrow/${b.id}`}
          className="flex items-center gap-3 rounded-2xl border border-ink-200 p-3 transition-colors hover:border-teal-500 hover:bg-teal-50/50"
          >
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg">
        <BookCover title={b.title} coverUrl={b.coverUrl} className="!p-1.5 [&_span]:text-[0.55rem] [&_span]:leading-3" />
        </div>div>
        <div className="min-w-0 flex-1">
        <p className="font-bold leading-6 text-ink-900">{b.title}</p>p>
        <p className="text-sm text-ink-600">{b.author}</p>p>
        <p className="mt-1 text-xs text-leaf-700">متاح: {b.copiesAvailable} من {b.copiesTotal}</p>p>
        </div>div>
        <span className="hidden text-sm font-bold text-brand-700 sm:block">اختيار</span>span>
        </Link>Link>
        </li>li>
        ))}
      </ul>ul>
      )}
      </EmptyState>div>
      </div>
      </>div>
      );
      }
    
    /* ----------- borrow form: trainee name, trainee id and the selected book ----------- */
    interface BorrowValues {
      fullName: string;
    traineeId: string;
    email: string;
    phone: string;
      }
    
    type Success = { referenceCode: string; url?: string; embed?: boolean; sink?: boolean };
    
    function BorrowForm({ bookId }: { bookId: number }) {
      const { config } = useConfig();
    const book = useAsync(() => api.get<Book>(`/public/books/${bookId}`), [bookId]);
    const cfg = config?.borrow;
    const readiness = formReadiness(cfg, config?.relay.borrow);
    
    const [values, setValues] = useState<BorrowValues>({ fullName: '', traineeId: '', email: '', phone: '' });
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState<Success | null>(null);
    
    useEffect(() => {
      if (Number.isInteger(bookId) && bookId > 0) track('borrow_start', { targetId: bookId });
      }, [bookId]);
    
    const set = (key: keyof BorrowValues) => (e: { target: { value: string } }) => {
      const raw = e.target.value;
    const value = key === 'traineeId' || key === 'phone' ? toLatinDigits(raw).replace(/\s/g, '') : raw;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
      };
    
    const validate = useMemo(
    () => (v: BorrowValues): Errors =>
    clean({
      fullName: rules.name(v.fullName),
    traineeId: rules.traineeId(v.traineeId),
    email: rules.email(v.email, Boolean(cfg?.requireEmail)),
    phone: rules.phone(v.phone, Boolean(cfg?.requirePhone)),
      }),
    [cfg],
    );
    
    if (book.loading && !book.data) return <Spinner />;
    if (book.error || !book.data) {
      return (
    <EmptyState
      icon={BookOpen}
      title="تعذر العثور على الكتاب"
      description={book.error ?? 'قد يكون الكتاب غير متاح أو تم حذفه.'}
      action={<ButtonLink to="/borrow" variant="primary">اختيار كتاب آخر</ButtonLink>ButtonLink>}
    />
    );
      }
    const b = book.data;
    const available = b.copiesAvailable > 0;
    
    const submit = async (e: FormEvent) => {
      e.preventDefault();
    if (!cfg) return;
    setServerError('');
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
    return;
      }
    // the dates are computed automatically: today and today plus the loan period from the settings
    const borrowDate = todayISO();
    const returnDate = todayISO(cfg.defaultLoanDays);
    setSubmitting(true);
    const pending = cfg.mode === 'msforms' && cfg.openIn === 'newtab' ? openPendingWindow() : null;
    try {
      if (cfg.mode === 'msforms') {
        const res = await api.post<{ referenceCode: string; bookTitle: string; bookAuthor: string }>('/forms/borrow/request', {
          bookId: b.id,
    borrowDate,
    returnDate,
      });
    const url = buildPrefilledUrl(
    cfg.msFormUrl,
    cfg.prefill,
      {
        fullName: values.fullName,
    traineeId: values.traineeId,
    email: values.email,
    phone: values.phone,
    specialty: '',
    notes: '',
    borrowDate,
    returnDate,
    bookTitle: res.bookTitle,
    bookAuthor: res.bookAuthor,
    referenceCode: res.referenceCode,
      },
    cfg.openIn === 'embed',
    );
    pending?.go(url);
    setSuccess({ referenceCode: res.referenceCode, url, embed: cfg.openIn === 'embed' });
      } else {
        const res = await api.post<{ referenceCode: string; channel: 'flow' | 'sink' }>('/forms/borrow/relay', {
          fullName: values.fullName,
    traineeId: values.traineeId,
    email: values.email.trim(),
    phone: values.phone.trim(),
    bookId: b.id,
    borrowDate,
    returnDate,
      });
    setSuccess({ referenceCode: res.referenceCode, sink: res.channel === 'sink' });
      }
    // clear the personal data from memory right after sending
    setValues({ fullName: '', traineeId: '', email: '', phone: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        pending?.close();
    if (err instanceof ApiError && Object.keys(err.fields).length) {
      setErrors(err.fields);
    focusFirstError(err.fields);
      }
    setServerError(errorMessage(err));
      } finally {
        setSubmitting(false);
      }
      };
    
    if (success) {
      const ref = (
    <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-2 text-sm">
    الرمز المرجعي: <strong dir="ltr" className="font-mono text-base text-brand-800">{success.referenceCode}</strong>strong>
    </span>span>
    );
    if (success.url) {
      return (
    <div className="mx-auto max-w-3xl">
    <OfficialFormStep title="تم تجهيز طلب الاستعارة" url={success.url} embed={Boolean(success.embed)}>
    <p>
    سُجّل طلبك المبدئي لكتاب «{b.title}». <strong>الخطوة الأخيرة:</strong>strong> أرسلي النموذج الرسمي للمؤسسة ليكتمل تسجيل الطلب.
    </p>p>
      {ref}
    </OfficialFormStep>OfficialFormStep>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
    <ButtonLink to="/books" variant="outline">العودة إلى الكتب</ButtonLink>ButtonLink>
    </div>div>
    </div>div>
    );
      }
    return (
    <div className="mx-auto max-w-2xl space-y-4">
      {success.sink && <SinkNotice />}
    <div className="card animate-scale-in p-8 text-center" role="status">
    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
    <CheckCircle2 className="size-9" aria-hidden />
    </div>div>
    <h2 className="mt-4 text-2xl font-bold">تم تسجيل طلب الاستعارة بنجاح</h2>h2>
    <p className="mt-2 text-ink-600">
    وصل طلبك لاستعارة كتاب «{b.title}» إلى المكتبة. احتفظي بالرمز المرجعي لمراجعة الطلب عند الاستلام.
    </p>p>
      {ref}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
    <ButtonLink to="/books" variant="primary">استعراض كتب أخرى</ButtonLink>ButtonLink>
    <ButtonLink to="/" variant="outline">الرئيسية</ButtonLink>ButtonLink>
    </div>div>
    </div>div>
    </div>div>
    );
      }
    
    return (
    <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
    <aside className="card overflow-hidden lg:sticky lg:top-24">
    <div className="h-56">
    <BookCover title={b.title} author={b.author} coverUrl={b.coverUrl} />
    </div>div>
    <div className="space-y-2 p-5">
    <Badge tone={available ? 'green' : 'gray'}>{available ? 'متاح' : 'غير متاح'}</Badge>Badge>
    <h2 className="text-lg leading-8 font-bold">{b.title}</h2>h2>
      {b.author && <p className="text-sm text-ink-600">المؤلف: {b.author}</p>p>}
      {b.categoryName && <p className="text-sm text-ink-600">التصنيف: {b.categoryName}</p>p>}
    <p className="text-xs text-ink-500">النسخ المتاحة: {b.copiesAvailable} من {b.copiesTotal}</p>p>
    <Link to="/borrow" className="inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand-700 hover:underline">
    <ArrowRight className="size-4" aria-hidden /> تغيير الكتاب
    </Link>Link>
    </div>div>
    </aside>aside>
    
    <form className="card space-y-6 p-5 sm:p-7" onSubmit={submit} noValidate>
    <div>
    <h2 className="text-xl font-bold">نموذج طلب الاستعارة</h2>h2>
    <p className="mt-1 text-sm text-ink-600">الاسم والرقم التدريبي فقط، واسم الكتاب يُعبأ تلقائيًا من الكتاب المختار.</p>p>
    </div>div>
    
      {!available && <Alert tone="warning" title="الكتاب غير متاح حاليًا">جميع النسخ مستعارة. يمكنك اختيار كتاب آخر.</Alert>Alert>}
      {!readiness.ready && <FormNotReady what="نموذج الاستعارة" />}
      {serverError && <Alert tone="error">{serverError}</Alert>Alert>}
    
    <fieldset className="space-y-4" disabled={!readiness.ready || !available}>
    <legend className="mb-3 text-sm font-bold text-teal-700">بيانات المستعيرة</legend>legend>
    <div className="grid gap-4 sm:grid-cols-2">
    <Input label="اسم المتدربة" name="fullName" required autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} wrapperClass="sm:col-span-2" />
    <Input label="الرقم التدريبي" name="traineeId" required inputMode="numeric" autoComplete="off" value={values.traineeId} onChange={set('traineeId')} error={errors.traineeId} className="ltr" wrapperClass="sm:col-span-2" />
      {cfg?.requireEmail && (
        <Input label="البريد الإلكتروني" name="email" type="email" required autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
        )}
      {cfg?.requirePhone && (
        <Input label="رقم الجوال" name="phone" type="tel" required inputMode="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} error={errors.phone} placeholder="05XXXXXXXX" />
        )}
    </div>div>
    </fieldset>fieldset>
    
    <fieldset className="space-y-4" disabled>
    <legend className="mb-3 text-sm font-bold text-teal-700">الكتاب المطلوب</legend>legend>
    <div className="grid gap-4 sm:grid-cols-2">
    <Input label="اسم الكتاب" value={b.title} readOnly hint="يُعبأ تلقائيًا من الكتاب المختار" className="bg-ink-50" />
    <Input label="مؤلف الكتاب" value={b.author || '—'} readOnly className="bg-ink-50" />
    </div>div>
    </fieldset>fieldset>
    
      {cfg && <PrivacyNote mode={cfg.mode} />}
    
    <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
    <ButtonLink to="/books" variant="ghost">إلغاء</ButtonLink>ButtonLink>
    <Button type="submit" variant="gradient" size="lg" loading={submitting} disabled={!readiness.ready || !available} icon={<Send className="size-5" />}>
      {cfg?.mode === 'msforms' ? 'متابعة إلى النموذج الرسمي' : 'إرسال طلب الاستعارة'}
    </Button>Button>
    </div>div>
    </form>form>
    </div>div>
    );
      }
    </>
      return (
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
      <aside className="card overflow-hidden lg:sticky lg:top-24">
      <div className="h-56">
      <BookCover title={b.title} author={b.author} coverUrl={b.coverUrl} />
      </div>div>
      <div className="space-y-2 p-5">
      <Badge tone={available ? 'green' : 'gray'}>{available ? 'متاح' : 'غير متاح'}</Badge>Badge>
      <h2 className="text-lg leading-8 font-bold">{b.title}</h2>h2>
        {b.author && <p className="text-sm text-ink-600">المؤلف: {b.author}</p>p>}
        {b.categoryName && <p className="text-sm text-ink-600">التصنيف: {b.categoryName}</p>p>}
      <p className="text-xs text-ink-500">النسخ المتاحة: {b.copiesAvailable} من {b.copiesTotal}</p>p>
      <Link to="/borrow" className="inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand-700 hover:underline">
      <ArrowRight className="size-4" aria-hidden /> تغيير الكتاب
      </Link>Link>
      </div>div>
      </aside>aside>
      
      <form className="card space-y-6 p-5 sm:p-7" onSubmit={submit} noValidate>
      <div>
      <h2 className="text-xl font-bold">نموذج طلب الاستعارة</h2>h2>
      <p className="mt-1 text-sm text-ink-600">الاسم والرقم التدريبي فقط، واسم الكتاب يُعبأ تلقائيًا من الكتاب المختار.</p>p>
      </div>div>
      
        {!available && <Alert tone="warning" title="الكتاب غير متاح حاليًا">جميع النسخ مستعارة. يمكنك اختيار كتاب آخر.</Alert>Alert>}
        {!readiness.ready && <FormNotReady what="نموذج الاستعارة" />}
        {serverError && <Alert tone="error">{serverError}</Alert>Alert>}
      
      <fieldset className="space-y-4" disabled={!readiness.ready || !available}>
      <legend className="mb-3 text-sm font-bold text-teal-700">بيانات المستعيرة</legend>legend>
      <div className="grid gap-4 sm:grid-cols-2">
      <Input label="اسم المتدربة" name="fullName" required autoComplete="name" value={values.fullName} onChange={set('fullName')} error={errors.fullName} wrapperClass="sm:col-span-2" />
      <Input label="الرقم التدريبي" name="traineeId" required inputMode="numeric" autoComplete="off" value={values.traineeId} onChange={set('traineeId')} error={errors.traineeId} className="ltr" wrapperClass="sm:col-span-2" />
        {cfg?.requireEmail && (
      <Input label="البريد الإلكتروني" name="email" type="email" required autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} placeholder="name@example.com" />
      )}
        {cfg?.requirePhone && (
      <Input label="رقم الجوال" name="phone" type="tel" required inputMode="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} error={errors.phone} placeholder="05XXXXXXXX" />
      )}
      </div>div>
      </fieldset>fieldset>
      
      <fieldset className="space-y-4" disabled>
      <legend className="mb-3 text-sm font-bold text-teal-700">الكتاب المطلوب</legend>legend>
      <div className="grid gap-4 sm:grid-cols-2">
      <Input label="اسم الكتاب" value={b.title} readOnly hint="يُعبأ تلقائيًا من الكتاب المختار" className="bg-ink-50" />
      <Input label="مؤلف الكتاب" value={b.author || '—'} readOnly className="bg-ink-50" />
      </div>div>
      </fieldset>fieldset>
      
        {cfg && <PrivacyNote mode={cfg.mode} />}
      
      <div className="flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <ButtonLink to="/books" variant="ghost">إلغاء</ButtonLink>ButtonLink>
      <Button type="submit" variant="gradient" size="lg" loading={submitting} disabled={!readiness.ready || !available} icon={<Send className="size-5" />}>
        {cfg?.mode === 'msforms' ? 'متابعة إلى النموذج الرسمي' : 'إرسال طلب الاستعارة'}
      </Button>Button>
      </div>div>
      </form>form>
      </div>div>
    );
      }
    </div>
