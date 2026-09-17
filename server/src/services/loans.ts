import crypto from 'node:crypto';
import { getDb, transaction } from '../db/connection.js';
import { booksRepo, loansRepo, type Loan, type LoanChannel, type LoanStatus } from '../repositories/index.js';
import { HttpError, notFound } from '../utils/http.js';

/** رمز مرجعي قصير يُعبأ في نموذج المؤسسة لربط الطلب بسجله المجهول دون تخزين هوية الطالبة */
export function generateReferenceCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  const code = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `LB-${code}`;
}

export function createLoanRequest(input: {
  bookId: number;
  specialty: string;
  borrowDate: string;
  expectedReturnDate: string | null;
  channel: LoanChannel;
}): Loan {
  const book = booksRepo.get(input.bookId);
  if (!book || !book.isActive) throw notFound('الكتاب');
  if (book.copiesAvailable <= 0) throw new HttpError(409, 'هذا الكتاب غير متاح للاستعارة حاليًا');
  let referenceCode = generateReferenceCode();
  const exists = getDb().prepare('SELECT 1 FROM loans WHERE reference_code = ?');
  while (exists.get(referenceCode)) referenceCode = generateReferenceCode();
  return loansRepo.create({
    referenceCode,
    bookId: book.id,
    bookTitle: book.title,
    specialty: input.specialty,
    borrowDate: input.borrowDate,
    expectedReturnDate: input.expectedReturnDate,
    status: 'requested',
    channel: input.channel,
    isDemo: false,
  });
}

/**
 * تغيير حالة الاستعارة مع تحديث رصيد النسخ:
 * requested → borrowed  : ينقص الرصيد
 * borrowed  → returned/cancelled/requested : يزيد الرصيد
 */
export function changeLoanStatus(id: number, status: LoanStatus): Loan {
  return transaction(() => {
    const loan = loansRepo.get(id);
    if (!loan) throw notFound('طلب الاستعارة');
    if (loan.status === status) return loan;
    const db = getDb();
    if (loan.bookId) {
      if (status === 'borrowed') {
        const res = db
          .prepare('UPDATE books SET copies_available = copies_available - 1 WHERE id = ? AND copies_available > 0')
          .run(loan.bookId);
        if (Number(res.changes) === 0) throw new HttpError(409, 'لا توجد نسخة متاحة من هذا الكتاب لتسليمها');
      } else if (loan.status === 'borrowed') {
        db.prepare('UPDATE books SET copies_available = MIN(copies_total, copies_available + 1) WHERE id = ?').run(loan.bookId);
      }
    }
    return loansRepo.update(id, { status })!;
  });
}

export function deleteLoan(id: number) {
  const loan = loansRepo.get(id);
  if (!loan) throw notFound('طلب الاستعارة');
  if (loan.status === 'borrowed') changeLoanStatus(id, 'returned');
  loansRepo.remove(id);
}
