/**
 * إحصائيات مجهولة الهوية: معرّف جلسة عشوائي يبقى في sessionStorage فقط
 * ويُحوَّل في الخادم إلى تجزئة يومية. لا تُرسل أي بيانات شخصية.
 */
const KEY = 'lib_sid';

function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export type TrackType =
  | 'page_view'
  | 'resources_visit'
  | 'resource_open'
  | 'books_visit'
  | 'borrow_start'
  | 'projects_visit'
  | 'events_visit'
  | 'surveys_visit'
  | 'survey_open'
  | 'visit_page';

export function track(type: TrackType, extra: { targetId?: number; path?: string } = {}) {
  const body = JSON.stringify({ type, sessionId: sessionId(), ...extra });
  try {
    // keepalive يضمن وصول الحدث حتى عند فتح رابط خارجي أو مغادرة الصفحة
    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* الإحصائيات لا يجب أن تعطل تجربة الاستخدام */
  }
}
