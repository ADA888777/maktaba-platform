import { Router } from 'express';
import { trackSchema } from '../schemas.js';
import { PUBLIC_EVENT_TYPES, trackEvent, type AnalyticsEventType } from '../services/analytics.js';
import { booksRepo, resourcesRepo, surveysRepo } from '../repositories/index.js';
import { HttpError } from '../utils/http.js';

export const analyticsRouter = Router();

const targetValidators: Partial<Record<AnalyticsEventType, (id: number) => boolean>> = {
  resource_open: (id) => Boolean(resourcesRepo.get(id)?.isActive),
  survey_open: (id) => Boolean(surveysRepo.get(id)?.isPublished),
  borrow_start: (id) => Boolean(booksRepo.get(id)?.isActive),
};

/** تسجيل حدث استخدام مجهول (بدون أي بيانات شخصية) */
analyticsRouter.post('/track', (req, res) => {
  const data = trackSchema.parse(req.body);
  if (!(PUBLIC_EVENT_TYPES as readonly string[]).includes(data.type)) throw new HttpError(400, 'نوع حدث غير معروف');
  const type = data.type as AnalyticsEventType;
  const validate = targetValidators[type];
  if (validate && (!data.targetId || !validate(data.targetId))) throw new HttpError(400, 'العنصر المرتبط بالحدث غير صالح');
  trackEvent({
    type,
    targetId: validate ? data.targetId : null,
    path: type === 'page_view' ? data.path?.split('?')[0] : '',
    sessionId: data.sessionId,
  });
  res.status(204).end();
});
