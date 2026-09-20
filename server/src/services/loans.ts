import crypto from 'node:crypto';
import { execute, queryOne, transaction } from '../db/connection.js';
import { booksRepo, loansRepo, type Loan, type LoanChannel, type LoanStatus } from '../repositories/index.js';
import { HttpError, notFound } from '../utils/http.js';

/** Short reference code filled into the institution form so the request can be matched to its anonymous record */
export function generateReferenceCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  const code = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
  return `LB-${code}`;
}

export async function createLoanRequest(input: {
  bookId: number;
  specialty: string;
  borrowDate: string;
  expectedReturnDate: string | null;
  channel: LoanChannel;
}): Promise<Loan> {
  const book = await booksRepo.get(input.bookId);
  if (!book || !book.isActive) throw notFound('الكتاب');
  if (book.copiesAvailable <= 0) throw new HttpError(409, 'هذا الكتاب غير متاح للاستعارة حاليًا');
  let referenceCode = generateReferenceCode();
  while (await queryOne('SELECT 1 FROM loans WHERE reference_code = $1', [referenceCode])) {
    referenceCode = generateReferenceCode();
  }
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
* Changes the loan status and keeps the copy stock in sync:
* requested -> borrowed : one copy less
* borrowed -> returned / cancelled / requested : one copy back
*/
export async function changeLoanStatus(id: number, status: LoanStatus): Promise<Loan> {
  await transaction(async (client) => {
    const { rows } = await client.query('SELECT id, book_id, status FROM loans WHERE id = $1 FOR UPDATE', [id]);
    const loan = rows[0] as { id: number; book_id: number | null; status: LoanStatus } | undefined;
    if (!loan) throw notFound('طلب الاستعارة');
    if (loan.status === status) return;
    if (loan.book_id) {
      if (status === 'borrowed') {
        const res = await client.query(
          'UPDATE books SET copies_available = copies_available - 1 WHERE id = $1 AND copies_available > 0',
          [loan.book_id],
          );
        if (!res.rowCount) throw new HttpError(409, 'لا توجد نسخة متاحة من هذا الكتاب لتسليمها');
      } else if (loan.status === 'borrowed') {
        await client.query(
          'UPDATE books SET copies_available = LEAST(copies_total, copies_available + 1) WHERE id = $1',
          [loan.book_id],
          );
      }
    }
    await client.query('UPDATE loans SET status = $1, updated_at = public.iso_now() WHERE id = $2', [status, id]);
  });
  const updated = await loansRepo.get(id);
  if (!updated) throw notFound('طلب الاستعارة');
  return updated;
}

export async function deleteLoan(id: number): Promise<void> {
  const loan = await loansRepo.get(id);
  if (!loan) throw notFound('طلب الاستعارة');
  if (loan.status === 'borrowed') await changeLoanStatus(id, 'returned');
  await execute('DELETE FROM loans WHERE id = $1', [id]);
}
