import { CheckCircle2, ExternalLink, FlaskConical, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { ExternalButton } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import type { FormConfig, RelayAvailability } from '../../lib/types';

/** هل النموذج جاهز للاستخدام حسب طريقة الربط المختارة؟ */
export function formReadiness(cfg: FormConfig | undefined, relay: RelayAvailability | undefined) {
  if (!cfg) return { ready: false, sink: false };
  if (cfg.mode === 'msforms') return { ready: Boolean(cfg.msFormUrl), sink: false };
  return { ready: Boolean(relay?.flowConfigured || relay?.devSink), sink: !relay?.flowConfigured && Boolean(relay?.devSink) };
}

export function FormNotReady({ what }: { what: string }) {
  return (
    <Alert tone="warning" title={`${what} غير متاح مؤقتًا`}>
      لم تُكمل إدارة المكتبة ربط هذا النموذج بنظام المؤسسة بعد. يمكنك مراجعة المكتبة مباشرة، أو العودة لاحقًا.
    </Alert>
  );
}

export function PrivacyNote({ mode }: { mode: 'msforms' | 'flow' }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-xs leading-6 text-ink-600">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
      {mode === 'msforms'
        ? 'بياناتك الشخصية تُنقل مباشرة إلى نموذج Microsoft Forms الرسمي التابع للمؤسسة، ولا تُحفظ في قاعدة بيانات الموقع.'
        : 'بياناتك الشخصية تُرسل مباشرة إلى نظام المؤسسة الرسمي دون حفظها في قاعدة بيانات الموقع.'}
    </p>
  );
}

export function SinkNotice() {
  return (
    <Alert tone="warning" title="وضع التجربة">
      <span className="inline-flex items-center gap-1">
        <FlaskConical className="size-4" aria-hidden />
        النموذج يعمل في بيئة التطوير: تم التحقق من البيانات ثم تجاهلها دون تخزينها أو إرسالها لأي جهة.
      </span>
    </Alert>
  );
}

/** لوحة النجاح مع الخطوة الأخيرة في النموذج الرسمي */
export function OfficialFormStep({
  title, children, url, embed,
}: { title: string; children?: ReactNode; url: string; embed: boolean }) {
  return (
    <div className="space-y-5">
      <div className="card animate-scale-in p-6 text-center sm:p-8">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf-50 text-leaf-600">
          <CheckCircle2 className="size-9" aria-hidden />
        </div>
        <h2 className="mt-4 text-xl font-bold sm:text-2xl">{title}</h2>
        <div className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink-600 sm:text-base">{children}</div>
        {!embed && (
          <>
            <ExternalButton href={url} variant="gradient" size="lg" className="mt-6" icon={<ExternalLink className="size-5" />}>
              فتح النموذج الرسمي وإرساله
            </ExternalButton>
            <p className="mt-3 text-xs text-ink-500">
              تم فتح النموذج في نافذة جديدة. إن لم يظهر، استخدمي الزر أعلاه. بياناتك معبأة مسبقًا؛ راجعيها ثم اضغطي «إرسال».
            </p>
          </>
        )}
      </div>
      {embed && (
        <div className="card overflow-hidden">
          <p className="border-b border-ink-100 px-5 py-3 text-sm font-semibold text-ink-700">
            راجعي بياناتك في النموذج الرسمي ثم اضغطي «إرسال»
          </p>
          <iframe
            title="النموذج الرسمي"
            src={url}
            className="block h-[900px] w-full border-0"
            allow="clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </div>
  );
}

/** يفتح نافذة فارغة فورًا عند الضغط (تجنبًا لحظر النوافذ المنبثقة) ثم يوجهها بعد نجاح الطلب */
export function openPendingWindow() {
  const w = window.open('', '_blank');
  if (w) {
    w.opener = null;
    w.document.title = 'جارٍ فتح النموذج...';
    w.document.body.innerHTML =
      '<p style="font-family:system-ui;text-align:center;margin-top:30vh;direction:rtl">جارٍ فتح النموذج الرسمي...</p>';
  }
  return {
    go: (url: string) => {
      if (w && !w.closed) w.location.href = url;
    },
    close: () => w?.close(),
  };
}
