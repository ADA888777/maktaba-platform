import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, MapPinned, Send } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../lib/api';
import { useConfig } from '../../context/ConfigContext';
import { track } from '../../lib/analytics';
import { buildPrefilledUrl } from '../../lib/msforms';
import { clean, focusFirstError, rules, type Errors } from '../../lib/validation';
import { PageHero } from '../../components/ui/Misc';
import { CheckboxCard, Field, Input, Select, Textarea } from '../../components/ui/Field';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Alert, Spinner } from '../../components/ui/Feedback';
import {
  FormNotReady, OfficialFormStep, PrivacyNote, SinkNotice, formReadiness, openPendingWindow,
} from '../../components/public/OfficialForm';

interface VisitValues {
  fullName: string;
  specialty: string;
  hasVisited: '' | 'yes' | 'no';
  visitFrequency: string;
  reasons: string[];
  otherReason: string;
  mainService: string;
  otherService: string;
  suggestions: string;
}

const empty: VisitValues = {
  fullName: '', specialty: '', hasVisited: '', visitFrequency: '', reasons: [], otherReason: '', mainService: '', otherService: '', suggestions: '',
};

export default function VisitPage() {
  const { config, loading } = useConfig();
  const [values, setValues] = useState<VisitValues>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState<{ url?: string; embed?: boolean; sink?: boolean } | null>(null);

  useEffect(() => {
    track('visit_page');
  }, []);

  const cfg = config?.visit;
  const readiness = formReadiness(cfg, config?.relay.visit);
  const opts = config?.options;
  const specialties = config?.lists.specialties ?? [];
  const askSpecialty = specialties.length > 0;
  const OTHER_REASON = opts?.visitReasons.at(-1) ?? 'سبب آخر';
  const OTHER_SERVICE = opts?.visitServices.at(-1) ?? 'خدمة أخرى';

  const set = <K extends keyof VisitValues>(key: K, value: VisitValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const toggleReason = (reason: string, checked: boolean) =>
    set('reasons', checked ? [...values.reasons, reason] : values.reasons.filter((r) => r !== reason));

  const validate = (v: VisitValues) =>
    clean({
      fullName: rules.name(v.fullName),
      specialty: askSpecialty ? rules.required(v.specialty, 'التخصص') : '',
      hasVisited: v.hasVisited ? '' : 'اختاري إجابة',
      visitFrequency: v.hasVisited === 'yes' && !v.visitFrequency ? 'اختاري معدل زيارتك' : '',
      reasons: v.hasVisited === 'no' && !v.reasons.length ? 'اختاري سببًا واحدًا على الأقل' : '',
      otherReason: v.hasVisited === 'no' && v.reasons.includes(OTHER_REASON) && !v.otherReason.trim() ? 'اكتبي السبب' : '',
      mainService: v.mainService ? '' : 'اختاري الخدمة التي تستخدمينها غالبًا',
      otherService: v.mainService === OTHER_SERVICE && !v.otherService.trim() ? 'اكتبي اسم الخدمة' : '',
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!cfg) return;
    setServerError('');
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);

    const visited = values.hasVisited === 'yes';
    const anonymous = {
      specialty: values.specialty,
      hasVisited: visited,
      reasons: visited ? [] : values.reasons,
      mainService: values.mainService,
      visitFrequency: visited ? values.visitFrequency : '',
    };
    setSubmitting(true);
    const pending = cfg.mode === 'msforms' && cfg.openIn === 'newtab' ? openPendingWindow() : null;
    try {
      if (cfg.mode === 'msforms') {
        await api.post('/forms/visit/anonymous', anonymous);
        const url = buildPrefilledUrl(
          cfg.msFormUrl,
          cfg.prefill,
          {
            fullName: values.fullName,
            specialty: values.specialty,
            hasVisited: visited ? 'نعم' : 'لا',
            visitFrequency: anonymous.visitFrequency,
            reasons: anonymous.reasons.join('، '),
            otherReason: values.otherReason,
            mainService: values.mainService,
            otherService: values.otherService,
            suggestions: values.suggestions,
          },
          cfg.openIn === 'embed',
        );
        pending?.go(url);
        setDone({ url, embed: cfg.openIn === 'embed' });
      } else {
        const res = await api.post<{ channel: 'flow' | 'sink' }>('/forms/visit/relay', {
          ...anonymous,
          fullName: values.fullName,
          otherReason: values.otherReason,
          otherService: values.otherService,
          suggestions: values.suggestions,
        });
        setDone({ sink: res.channel === 'sink' });
      }
      setValues(empty);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      pending?.close();
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      setServerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        icon={MapPinned}
        eyebrow="زيارة المكتبة"
        title="استطلاع زيارة المكتبة"
        description="نرغب في معرفة تجربتك مع المكتبة: هل تزورينها؟ وإن لم تفعلي، ما السبب؟ إجاباتك تساعدنا على تطوير الخدمات."
      />
      <div className="container-page max-w-3xl pt-8">
        {loading && !config ? (
          <Spinner />
        ) : done ? (
          done.url ? (
            <OfficialFormStep title="شكرًا لمشاركتك" url={done.url} embed={Boolean(done.embed)}>
              سُجّلت إجاباتك في الإحصائيات. <strong>الخطوة الأخيرة:</strong> أرسلي النموذج الرسمي للمؤسسة لإكمال المشاركة.
            </OfficialFormStep>
          ) : (
            <div className="space-y-4">
              {done.sink && <SinkNotice />}
              <div className="card animate-scale-in p-8 text-center" role="status">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
                  <CheckCircle2 className="size-9" aria-hidden />
                </div>
                <h2 className="mt-4 text-2xl font-bold">شكرًا لمشاركتك!</h2>
                <p className="mt-2 text-ink-600">تم تسجيل إجاباتك بنجاح، وستساعدنا في تحسين خدمات المكتبة.</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <ButtonLink to="/" variant="primary">العودة للرئيسية</ButtonLink>
                  <Button variant="outline" onClick={() => setDone(null)}>مشاركة جديدة</Button>
                </div>
              </div>
            </div>
          )
        ) : (
          <form onSubmit={submit} noValidate className="card space-y-7 p-5 sm:p-8">
            {!readiness.ready && <FormNotReady what="استطلاع الزيارة" />}
            {serverError && <Alert tone="error">{serverError}</Alert>}

            <fieldset disabled={!readiness.ready} className="space-y-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="الاسم" name="fullName" required autoComplete="name" value={values.fullName} onChange={(e) => set('fullName', e.target.value)} error={errors.fullName} />
                {askSpecialty && (
                  <Select label="التخصص" name="specialty" required value={values.specialty} onChange={(e) => set('specialty', e.target.value)} error={errors.specialty} placeholder="اختاري التخصص" options={specialties} />
                )}
              </div>

              <Field label="هل سبق لك زيارة المكتبة؟" required error={errors.hasVisited}>
                <div role="radiogroup" className="grid grid-cols-2 gap-3">
                  <CheckboxCard type="radio" name="hasVisited" label="نعم" checked={values.hasVisited === 'yes'} onChange={() => set('hasVisited', 'yes')} />
                  <CheckboxCard type="radio" name="hasVisited" label="لا" checked={values.hasVisited === 'no'} onChange={() => set('hasVisited', 'no')} />
                </div>
              </Field>

              {values.hasVisited === 'yes' && (
                <div className="animate-fade-up">
                  <Field label="كم مرة تزورين المكتبة عادةً؟" required error={errors.visitFrequency}>
                    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                      {(opts?.visitFrequencies ?? []).map((f) => (
                        <CheckboxCard key={f} type="radio" name="visitFrequency" label={f} checked={values.visitFrequency === f} onChange={() => set('visitFrequency', f)} />
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {values.hasVisited === 'no' && (
                <div className="animate-fade-up space-y-4 rounded-2xl border border-teal-300/50 bg-teal-50/40 p-4 sm:p-5">
                  <Field label="ما سبب عدم زيارتك للمكتبة؟" required error={errors.reasons} hint="يمكنك اختيار أكثر من سبب">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(opts?.visitReasons ?? []).map((r) => (
                        <CheckboxCard
                          key={r}
                          name="reasons"
                          label={r}
                          checked={values.reasons.includes(r)}
                          onChange={(c) => toggleReason(r, c)}
                        />
                      ))}
                    </div>
                  </Field>
                  {values.reasons.includes(OTHER_REASON) && (
                    <Input label="اذكري السبب" name="otherReason" required value={values.otherReason} maxLength={300} onChange={(e) => set('otherReason', e.target.value)} error={errors.otherReason} />
                  )}
                </div>
              )}

              <Field label="ما الخدمة التي تستخدمينها غالبًا؟" required error={errors.mainService}>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                  {(opts?.visitServices ?? []).map((s) => (
                    <CheckboxCard key={s} type="radio" name="mainService" label={s} checked={values.mainService === s} onChange={() => set('mainService', s)} />
                  ))}
                </div>
              </Field>
              {values.mainService === OTHER_SERVICE && (
                <Input label="اذكري الخدمة" name="otherService" required value={values.otherService} maxLength={150} onChange={(e) => set('otherService', e.target.value)} error={errors.otherService} />
              )}

              <Textarea label="اقتراحاتك لتطوير المكتبة" name="suggestions" value={values.suggestions} maxLength={1000} onChange={(e) => set('suggestions', e.target.value)} />
            </fieldset>

            {cfg && <PrivacyNote mode={cfg.mode} />}
            <div className="flex justify-end border-t border-ink-100 pt-5">
              <Button type="submit" variant="gradient" size="lg" loading={submitting} disabled={!readiness.ready} icon={<Send className="size-5" />}>
                {cfg?.mode === 'msforms' ? 'متابعة إلى النموذج الرسمي' : 'إرسال الإجابات'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
