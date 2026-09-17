import { useState } from 'react';
import { CheckCircle2, CircleAlert, ExternalLink, Link2, Wand2 } from 'lucide-react';
import type { FormConfig, RelayAvailability, SiteSettings } from '../../../lib/types';
import { BORROW_FIELD_LABELS, VISIT_FIELD_LABELS, isMsFormsUrl, parsePrefilledUrl, buildPrefilledUrl } from '../../../lib/msforms';
import { Alert } from '../../../components/ui/Feedback';
import { Input, Select, Toggle, CheckboxCard, Field } from '../../../components/ui/Field';
import { Badge } from '../../../components/ui/Misc';
import { Button, ExternalButton } from '../../../components/ui/Button';

type Update = (fn: (d: SiteSettings) => void) => void;

export function FormsSettings({
  draft, update, relay, production, errors,
}: { draft: SiteSettings; update: Update; relay: { borrow: RelayAvailability; visit: RelayAvailability }; production: boolean; errors: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <Alert tone="info" title="كيف يحمي الربط بيانات الطالبات؟">
        <ul className="mt-1 list-disc space-y-1 ps-5">
          <li>النماذج تُنشأ في Microsoft Forms بحساب المؤسسة{draft.site.formsOwnerAccount ? ` (${draft.site.formsOwnerAccount})` : ''}، والردود تبقى في ذلك الحساب.</li>
          <li>الموقع لا يحفظ الاسم أو الرقم التدريبي أو البريد أو الجوال؛ يحفظ فقط بيانات إحصائية مجهولة (الكتاب، التخصص، التاريخ، الرمز المرجعي).</li>
          <li>لا توجد في المشروع كلمات مرور أو مفاتيح لحساب Microsoft، ولا يدخل الموقع إلى الحساب.</li>
        </ul>
      </Alert>

      <FormCard
        title="نموذج استعارة الكتب"
        cfg={draft.borrow}
        relay={relay.borrow}
        production={production}
        labels={BORROW_FIELD_LABELS}
        envName="FLOW_URL_BORROW"
        errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('borrow.')).map(([k, v]) => [k.slice(7), v]))}
        onChange={(fn) => update((d) => fn(d.borrow))}
        sampleValues={{ bookTitle: 'العادات الذرية', bookAuthor: 'جيمس كلير', referenceCode: 'LB-TEST01', specialty: draft.lists.specialties[0] ?? '' }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="البريد الإلكتروني مطلوب" checked={draft.borrow.requireEmail} onChange={(v) => update((d) => { d.borrow.requireEmail = v; })} />
          <Toggle label="رقم الجوال مطلوب" checked={draft.borrow.requirePhone} onChange={(v) => update((d) => { d.borrow.requirePhone = v; })} />
          <Toggle label="التاريخ المتوقع للإرجاع مطلوب" checked={draft.borrow.requireReturnDate} onChange={(v) => update((d) => { d.borrow.requireReturnDate = v; })} />
          <Input
            label="مدة الاستعارة الافتراضية (يومًا)"
            type="number"
            min={1}
            max={120}
            required
            value={draft.borrow.defaultLoanDays}
            onChange={(e) => update((d) => { d.borrow.defaultLoanDays = Math.max(1, Number(e.target.value) || 1); })}
          />
        </div>
      </FormCard>

      <FormCard
        title="استطلاع زيارة المكتبة"
        cfg={draft.visit}
        relay={relay.visit}
        production={production}
        labels={VISIT_FIELD_LABELS}
        envName="FLOW_URL_VISIT"
        errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('visit.')).map(([k, v]) => [k.slice(6), v]))}
        onChange={(fn) => update((d) => fn(d.visit))}
        sampleValues={{ hasVisited: 'لا', specialty: draft.lists.specialties[0] ?? '' }}
      />

      <Alert tone="info" title="الاستبيانات العامة">
        تُربط كل استبانة برابط Microsoft Forms الخاص بها من صفحة «الاستبيانات» في لوحة التحكم.
      </Alert>
    </div>
  );
}

function FormCard({
  title, cfg, relay, production, labels, envName, onChange, children, errors, sampleValues,
}: {
  title: string;
  cfg: FormConfig;
  relay: RelayAvailability;
  production: boolean;
  labels: Record<string, string>;
  envName: string;
  onChange: (fn: (c: FormConfig) => void) => void;
  children?: React.ReactNode;
  errors: Record<string, string>;
  sampleValues: Record<string, string>;
}) {
  const [prefilled, setPrefilled] = useState('');
  const [parseMsg, setParseMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [detected, setDetected] = useState<{ param: string; sample: string }[]>(
    Object.values(cfg.prefill).filter(Boolean).map((p) => ({ param: p, sample: '' })),
  );

  const ready = cfg.mode === 'msforms' ? isMsFormsUrl(cfg.msFormUrl) : relay.flowConfigured || relay.devSink;

  const analyze = () => {
    const parsed = parsePrefilledUrl(prefilled.trim());
    if (!parsed) {
      setParseMsg({ tone: 'error', text: 'الرابط غير صالح. تأكدي أنه رابط Microsoft Forms المعبأ مسبقًا ويبدأ بـ https://forms.office.com' });
      return;
    }
    if (!parsed.params.length) {
      setParseMsg({ tone: 'error', text: 'لم يُعثر على أسئلة معبأة في الرابط. عبّئي إجابات تجريبية قبل توليد الرابط.' });
      return;
    }
    // مطابقة تلقائية: إذا كتبتِ اسم الحقل (مثل fullName) كإجابة تجريبية يتم ربطه مباشرة
    const auto: Record<string, string> = {};
    parsed.params.forEach(({ param, sample }) => {
      const key = Object.keys(labels).find((k) => k.toLowerCase() === sample.trim().toLowerCase() || labels[k] === sample.trim());
      if (key) auto[key] = param;
    });
    onChange((c) => {
      c.msFormUrl = parsed.base;
      c.prefill = { ...c.prefill, ...auto };
    });
    setDetected(parsed.params);
    setParseMsg({ tone: 'success', text: `تم استخراج ${parsed.params.length} سؤال${Object.keys(auto).length ? ` وربط ${Object.keys(auto).length} منها تلقائيًا` : ''}. أكملي الربط أدناه.` });
  };

  const testUrl = isMsFormsUrl(cfg.msFormUrl)
    ? buildPrefilledUrl(cfg.msFormUrl, cfg.prefill, { ...Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, `تجربة: ${v}`])), ...sampleValues })
    : '';

  const paramOptions = [...new Set([...detected.map((d) => d.param), ...Object.values(cfg.prefill).filter(Boolean)])];

  return (
    <section className="card space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {ready ? <Badge tone="green" icon={CheckCircle2}>جاهز للاستخدام</Badge> : <Badge tone="amber" icon={CircleAlert}>يحتاج إلى إعداد</Badge>}
      </div>

      <Field label="طريقة الربط" required>
        <div className="grid gap-2 md:grid-cols-2">
          <CheckboxCard type="radio" name={`${title}-mode`} checked={cfg.mode === 'msforms'} onChange={() => onChange((c) => { c.mode = 'msforms'; })}
            label="Microsoft Forms مباشرة (موصى به): تُكمل الطالبة الإرسال في النموذج الرسمي المعبأ مسبقًا" />
          <CheckboxCard type="radio" name={`${title}-mode`} checked={cfg.mode === 'flow'} onChange={() => onChange((c) => { c.mode = 'flow'; })}
            label="Power Automate: يُرسل نموذج الموقع البيانات مباشرة إلى تدفق في حساب المؤسسة" />
        </div>
      </Field>

      {cfg.mode === 'msforms' ? (
        <>
          <ol className="list-decimal space-y-1.5 rounded-xl bg-ink-50 p-4 ps-8 text-sm leading-7 text-ink-700">
            <li>افتحي النموذج في Microsoft Forms بحساب المؤسسة، ومن قائمة «...» اختاري <strong>«الحصول على عنوان URL معبأ مسبقًا»</strong> (Get pre-filled URL).</li>
            <li>في كل سؤال تريدين تعبئته من الموقع، اكتبي اسم الحقل كإجابة تجريبية (مثل: <code dir="ltr">bookTitle</code> أو «اسم الكتاب»)، ثم انسخي الرابط.</li>
            <li>الصقي الرابط أدناه واضغطي «تحليل الرابط»، ثم راجعي الربط واحفظي الإعدادات.</li>
          </ol>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input label="الرابط المعبأ مسبقًا" value={prefilled} onChange={(e) => setPrefilled(e.target.value)} placeholder="https://forms.office.com/Pages/ResponsePage.aspx?id=...&r..." dir="ltr" wrapperClass="flex-1" />
            <Button variant="secondary" icon={<Wand2 className="size-4" />} onClick={analyze} disabled={!prefilled.trim()}>تحليل الرابط</Button>
          </div>
          {parseMsg && <Alert tone={parseMsg.tone}>{parseMsg.text}</Alert>}

          <Input
            label="رابط النموذج الأساسي"
            required
            value={cfg.msFormUrl}
            onChange={(e) => onChange((c) => { c.msFormUrl = e.target.value.trim(); })}
            placeholder="https://forms.office.com/r/..."
            dir="ltr"
            error={errors.msFormUrl}
            hint="يُملأ تلقائيًا من التحليل، أو الصقي رابط المشاركة العادي (بدون تعبئة مسبقة)"
          />

          <Field label="طريقة عرض النموذج للطالبة" required>
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckboxCard type="radio" name={`${title}-open`} checked={cfg.openIn === 'newtab'} onChange={() => onChange((c) => { c.openIn = 'newtab'; })} label="فتح في نافذة جديدة" />
              <CheckboxCard type="radio" name={`${title}-open`} checked={cfg.openIn === 'embed'} onChange={() => onChange((c) => { c.openIn = 'embed'; })} label="تضمين داخل صفحة الموقع" />
            </div>
          </Field>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-800"><Link2 className="size-4" /> ربط حقول الموقع بأسئلة النموذج</p>
            <p className="mb-3 text-xs leading-6 text-ink-500">
              الحقول غير المربوطة تُعبئها الطالبة يدويًا في النموذج الرسمي. للأسئلة من نوع «اختيار» يجب أن تطابق القيم نص الخيارات حرفيًا؛ ويُفضّل جعل الأسئلة متعددة الاختيارات نصية.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(labels).map(([key, label]) => (
                <Select
                  key={key}
                  label={label}
                  value={cfg.prefill[key] ?? ''}
                  placeholder="غير مربوط"
                  options={paramOptions.map((p) => {
                    const d = detected.find((x) => x.param === p);
                    return { value: p, label: d?.sample ? `${d.sample} (${p.slice(0, 10)}…)` : p };
                  })}
                  onChange={(e) =>
                    onChange((c) => {
                      const next = { ...c.prefill };
                      if (e.target.value) next[key] = e.target.value;
                      else delete next[key];
                      c.prefill = next;
                    })
                  }
                />
              ))}
            </div>
          </div>

          {testUrl && (
            <ExternalButton href={testUrl} variant="outline" size="sm" icon={<ExternalLink className="size-4" />}>
              معاينة النموذج بقيم تجريبية (لا ترسليه)
            </ExternalButton>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {relay.flowConfigured ? (
            <Alert tone="success" title="رابط التدفق مضبوط في متغيرات البيئة">
              ستُرسل البيانات إلى تدفق Power Automate في حساب المؤسسة دون حفظها في الموقع.
            </Alert>
          ) : relay.devSink && !production ? (
            <Alert tone="warning" title="وضع التجربة مفعّل">
              لم يُضبط <code dir="ltr">{envName}</code> بعد؛ النموذج يعمل للتجربة فقط وتُتجاهل البيانات بعد التحقق منها.
            </Alert>
          ) : (
            <Alert tone="error" title="رابط التدفق غير مضبوط">
              أضيفي <code dir="ltr">{envName}</code> في ملف البيئة على الخادم ثم أعيدي التشغيل. لن يعمل النموذج قبل ذلك.
            </Alert>
          )}
          <ol className="list-decimal space-y-1.5 rounded-xl bg-ink-50 p-4 ps-8 text-sm leading-7 text-ink-700">
            <li>في Power Automate بحساب المؤسسة، أنشئي تدفقًا يبدأ بـ «When an HTTP request is received».</li>
            <li>أضيفي خطوة لحفظ البيانات في Excel (OneDrive/SharePoint) أو قائمة SharePoint تابعة للمؤسسة.</li>
            <li>انسخي رابط HTTP POST وضعيه في <code dir="ltr">{envName}</code> على الخادم — لا يُكتب في الواجهة لأنه يحتوي توقيعًا سريًا.</li>
          </ol>
        </div>
      )}

      {children && <div className="border-t border-ink-100 pt-5">{children}</div>}
    </section>
  );
}
