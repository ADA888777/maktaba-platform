import { config, type FormKey } from '../config.js';
import { HttpError } from '../utils/http.js';

export type RelayResult = { delivered: boolean; channel: 'flow' | 'sink' };

export function relayAvailability(form: FormKey) {
  return { flowConfigured: Boolean(config.flows[form]), devSink: config.formsDevSink };
}

/**
 * يمرر بيانات النموذج إلى تدفق Power Automate في حساب المؤسسة.
 * البيانات لا تُخزَّن ولا تُسجَّل في الخادم إطلاقًا — تمر في الذاكرة فقط.
 */
export async function relayToFlow(form: FormKey, payload: Record<string, unknown>): Promise<RelayResult> {
  const url = config.flows[form];
  if (!url) {
    if (config.formsDevSink) return { delivered: false, channel: 'sink' };
    throw new HttpError(503, 'لم يتم إعداد جهة استقبال هذا النموذج بعد. يرجى التواصل مع إدارة المكتبة.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, submittedAt: new Date().toISOString(), ...payload }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[forms] تدفق "${form}" أعاد الحالة ${res.status}`);
      throw new HttpError(502, 'تعذر إرسال النموذج إلى نظام المؤسسة حاليًا، حاولي مرة أخرى بعد قليل');
    }
    return { delivered: true, channel: 'flow' };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.error(`[forms] فشل الاتصال بتدفق "${form}"`);
    throw new HttpError(502, 'تعذر الاتصال بنظام المؤسسة حاليًا، حاولي مرة أخرى بعد قليل');
  } finally {
    clearTimeout(timer);
  }
}
