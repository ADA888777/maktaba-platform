import { Router } from 'express';
import { booksRepo, loansRepo, visitResponsesRepo } from '../repositories/index.js';
import { borrowRelaySchema, loanRequestSchema, visitAnonymousSchema, visitRelaySchema } from '../schemas.js';
import { createLoanRequest } from '../services/loans.js';
import { relayToFlow } from '../services/forms.js';
import { getSettings } from '../services/settings.js';
import { trackEvent } from '../services/analytics.js';
import { HttpError } from '../utils/http.js';

/**
* Form routes.
* - msforms mode: the server only receives the non personal part (book, specialty, dates)
*   and the trainee completes her own data directly in the institution Microsoft Forms.
* - flow mode: the server relays the full form to Power Automate without storing it,
*   and keeps only the non personal part for statistics.
*/
export const formsRouter = Router();

formsRouter.post('/borrow/request', async (req, res) => {
  const settings = getSettings().borrow;
  if (settings.mode !== 'msforms' || !settings.msFormUrl) {
    throw new HttpError(409, 'نموذج الاستعارة غير مُعد بهذه الطريقة حاليًا');
  }
  const data = loanRequestSchema.parse(req.body);
  const loan = await createLoanRequest({
    bookId: data.bookId,
    specialty: data.specialty ?? '',
    borrowDate: data.borrowDate,
    expectedReturnDate: data.returnDate ?? null,
    channel: 'msforms',
  });
  const book = await booksRepo.get(data.bookId);
  trackEvent({ type: 'borrow_submitted', targetId: book?.id ?? null });
  res.status(201).json({ referenceCode: loan.referenceCode, bookTitle: book?.title ?? '', bookAuthor: book?.author ?? '' });
});

formsRouter.post('/borrow/relay', async (req, res) => {
  const settings = getSettings().borrow;
  if (settings.mode !== 'flow') throw new HttpError(409, 'نموذج الاستعارة غير مُعد بهذه الطريقة حاليًا');
  const data = borrowRelaySchema(settings).parse(req.body);
  const book = await booksRepo.get(data.bookId);
  if (!book) throw new HttpError(404, 'الكتاب غير موجود');
  const loan = await createLoanRequest({
    bookId: data.bookId,
    specialty: data.specialty ?? '',
    borrowDate: data.borrowDate,
    expectedReturnDate: data.returnDate || null,
    channel: 'flow',
  });
  try {
    const result = await relayToFlow('borrow', {
      referenceCode: loan.referenceCode,
      fullName: data.fullName,
      traineeId: data.traineeId,
      specialty: data.specialty ?? '',
      email: data.email,
      phone: data.phone,
      bookTitle: book.title,
      bookAuthor: book.author,
      borrowDate: data.borrowDate,
      returnDate: data.returnDate || '',
      notes: data.notes,
    });
    if (result.channel === 'sink') await loansRepo.update(loan.id, { channel: 'sink' });
    trackEvent({ type: 'borrow_submitted', targetId: book.id });
    res.status(201).json({ referenceCode: loan.referenceCode, bookTitle: book.title, delivered: result.delivered, channel: result.channel });
  } catch (e) {
    await loansRepo.remove(loan.id); // never keep a record for a request that did not reach the institution
  throw e;
  }
});

formsRouter.post('/visit/anonymous', async (req, res) => {
  const settings = getSettings().visit;
  if (settings.mode !== 'msforms') throw new HttpError(409, 'استطلاع الزيارة غير مُعد بهذه الطريقة حاليًا');
  const data = visitAnonymousSchema.parse(req.body);
  await visitResponsesRepo.create({
    hasVisited: data.hasVisited,
    specialty: data.specialty ?? '',
    reasons: data.hasVisited ? [] : data.reasons,
    mainService: data.mainService,
    visitFrequency: data.hasVisited ? data.visitFrequency : '',
  });
  trackEvent({ type: 'visit_survey_submitted' });
  res.status(201).json({ ok: true });
});

formsRouter.post('/visit/relay', async (req, res) => {
  const settings = getSettings().visit;
  if (settings.mode !== 'flow') throw new HttpError(409, 'استطلاع الزيارة غير مُعد بهذه الطريقة حاليًا');
  const data = visitRelaySchema.parse(req.body);
  const result = await relayToFlow('visit', {
    fullName: data.fullName,
    specialty: data.specialty ?? '',
    hasVisited: data.hasVisited ? 'نعم' : 'لا',
    visitFrequency: data.visitFrequency,
    reasons: data.reasons.join('، '),
    otherReason: data.otherReason,
    mainService: data.mainService,
    otherService: data.otherService,
    suggestions: data.suggestions,
  });
  await visitResponsesRepo.create({
    hasVisited: data.hasVisited,
    specialty: data.specialty ?? '',
    reasons: data.hasVisited ? [] : data.reasons,
    mainService: data.mainService,
    visitFrequency: data.hasVisited ? data.visitFrequency : '',
  });
  trackEvent({ type: 'visit_survey_submitted' });
  res.status(201).json({ ok: true, delivered: result.delivered, channel: result.channel });
});
