/**
 * اختبارات تكامل للواجهة البرمجية باستخدام قاعدة بيانات في الذاكرة.
 * التشغيل: npm test --prefix server
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.ANALYTICS_SALT = 'y'.repeat(40);
process.env.FORMS_DEV_SINK = 'true';
process.env.UPLOADS_DIR = `/tmp/lib-test-uploads-${process.pid}`;

const { initDatabase, getDb } = await import('../db/connection.js');
const { seedIfEmpty } = await import('../db/seed.js');
const { createApp } = await import('../app.js');
const { usersRepo } = await import('../repositories/index.js');
const { hashPassword } = await import('../utils/password.js');

let server: Server;
let base = '';
let adminCookie = '';
let librarianCookie = '';

async function call(method: string, path: string, body?: unknown, cookie = '') {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Library-Client': '1',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json, headers: res.headers };
}

async function login(username: string, password: string) {
  const res = await call('POST', '/api/auth/login', { username, password });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.headers.get('set-cookie')!.split(';')[0];
}

before(async () => {
  initDatabase(':memory:');
  seedIfEmpty({ demoAnalytics: false });
  usersRepo.create({ username: 'admin', displayName: 'مسؤولة', role: 'admin', passwordHash: await hashPassword('AdminPass123') });
  usersRepo.create({ username: 'lib', displayName: 'أمينة', role: 'librarian', passwordHash: await hashPassword('LibPass12345') });
  server = createApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  adminCookie = await login('admin', 'AdminPass123');
  librarianCookie = await login('lib', 'LibPass12345');
});

after(() => server.close());

describe('الواجهة العامة', () => {
  it('تعرض الإعدادات دون أسرار', async () => {
    const res = await call('GET', '/api/public/config');
    assert.equal(res.status, 200);
    assert.ok(res.body.lists.specialties.length > 0);
    assert.equal(JSON.stringify(res.body).includes('FLOW_URL'), false);
    assert.equal(typeof res.body.relay.borrow.flowConfigured, 'boolean');
  });

  it('تبحث وتصفي الكتب حسب الحالة', async () => {
    const all = await call('GET', '/api/public/books?pageSize=100');
    const unavailable = await call('GET', '/api/public/books?status=unavailable');
    assert.ok(all.body.total >= 16);
    assert.ok(unavailable.body.items.every((b: any) => b.copiesAvailable === 0));
    const search = await call('GET', `/api/public/books?search=${encodeURIComponent('الذرية')}`);
    assert.equal(search.body.items[0].title, 'العادات الذرية');
  });

  it('تفصل الفعاليات القادمة عن السابقة تلقائيًا', async () => {
    const up = await call('GET', '/api/public/events?scope=upcoming');
    const past = await call('GET', '/api/public/events?scope=past');
    const now = Date.now();
    assert.ok(up.body.items.length >= 3);
    assert.ok(past.body.items.length >= 2);
    assert.ok(up.body.items.every((e: any) => new Date(e.endsAt ?? e.startsAt).getTime() >= now - 2 * 3600e3));
    assert.ok(past.body.items.every((e: any) => e.phase === 'past'));
  });

  it('تخفي اسم الفريق غير المسموح بعرضه', async () => {
    const res = await call('GET', '/api/public/projects?pageSize=50');
    assert.ok(res.body.items.filter((p: any) => !p.showTeam).every((p: any) => p.teamName === ''));
  });

  it('ترفض أنواع أحداث الإحصائيات غير المعروفة وتقبل المعروفة', async () => {
    assert.equal((await call('POST', '/api/analytics/track', { type: 'hack' })).status, 400);
    assert.equal((await call('POST', '/api/analytics/track', { type: 'resource_open', targetId: 99999 })).status, 400);
    assert.equal((await call('POST', '/api/analytics/track', { type: 'resource_open', targetId: 1, sessionId: 'abcdefghijklmnop1234' })).status, 204);
    const row = getDb().prepare(`SELECT * FROM analytics_events WHERE event_type = 'resource_open'`).get() as any;
    assert.equal(row.target_id, 1);
    assert.notEqual(row.visitor_hash, 'abcdefghijklmnop1234');
  });
});

describe('النماذج والخصوصية', () => {
  it('يرفض طلب الاستعارة عبر Forms قبل إعداد الرابط', async () => {
    const res = await call('POST', '/api/forms/borrow/request', { bookId: 1, specialty: 'الشبكات', borrowDate: '2030-01-01' });
    assert.equal(res.status, 409);
  });

  it('يُسجل طلبًا مجهولًا ويعيد رمزًا مرجعيًا بعد ضبط Microsoft Forms', async () => {
    const settings = (await call('GET', '/api/admin/settings', undefined, adminCookie)).body.settings;
    settings.borrow.msFormUrl = 'https://evil.example.com/form';
    assert.equal((await call('PUT', '/api/admin/settings', settings, adminCookie)).status, 400);
    settings.borrow.msFormUrl = 'https://forms.office.com/Pages/ResponsePage.aspx?id=TEST';
    settings.borrow.prefill = { bookTitle: 'r1234abcd' };
    assert.equal((await call('PUT', '/api/admin/settings', settings, adminCookie)).status, 200);

    const res = await call('POST', '/api/forms/borrow/request', { bookId: 1, specialty: 'الشبكات', borrowDate: '2030-01-01', returnDate: '2030-01-10' });
    assert.equal(res.status, 201);
    assert.match(res.body.referenceCode, /^LB-[A-Z2-9]{6}$/);
  });

  it('يتحقق من نموذج الاستعارة الكامل ولا يخزن البيانات الشخصية', async () => {
    const settings = (await call('GET', '/api/admin/settings', undefined, adminCookie)).body.settings;
    settings.borrow.mode = 'flow';
    await call('PUT', '/api/admin/settings', settings, adminCookie);

    const bad = await call('POST', '/api/forms/borrow/relay', { fullName: 'a', traineeId: 'x', specialty: '', bookId: 1, borrowDate: '2030-01-01', returnDate: '2030-01-10', phone: '123' });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.fields.fullName && bad.body.fields.traineeId && bad.body.fields.phone);

    const ok = await call('POST', '/api/forms/borrow/relay', {
      fullName: 'نورة الاختبار', traineeId: '44556677', specialty: 'الشبكات', email: 'unique-test@example.com',
      phone: '0551234567', bookId: 2, borrowDate: '2030-01-01', returnDate: '2030-01-15', notes: 'ملاحظة سرية',
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.channel, 'sink');

    // البحث في كامل قاعدة البيانات عن أي أثر للبيانات الشخصية
    const db = getDb();
    const tables = (db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[]).map((t) => t.name);
    for (const t of tables) {
      const dump = JSON.stringify(db.prepare(`SELECT * FROM ${t}`).all());
      for (const secret of ['نورة الاختبار', '44556677', 'unique-test@example.com', '0551234567', 'ملاحظة سرية']) {
        assert.equal(dump.includes(secret), false, `وُجدت بيانات شخصية في جدول ${t}`);
      }
    }
  });

  it('يسجل الجزء المجهول فقط من استطلاع الزيارة ويتحقق من الشروط', async () => {
    const missing = await call('POST', '/api/forms/visit/anonymous', { specialty: 'الشبكات', hasVisited: false, reasons: [], mainService: 'استعارة الكتب' });
    assert.equal(missing.status, 400);
    assert.ok(missing.body.fields.reasons);
    const ok = await call('POST', '/api/forms/visit/anonymous', { specialty: 'الشبكات', hasVisited: false, reasons: ['الوقت غير مناسب'], mainService: 'استعارة الكتب', fullName: 'يجب ألا يُحفظ' });
    assert.equal(ok.status, 201);
    const dump = JSON.stringify(getDb().prepare('SELECT * FROM visit_responses').all());
    assert.equal(dump.includes('يجب ألا يُحفظ'), false);
  });
});

describe('لوحة التحكم والصلاحيات', () => {
  it('تمنع الوصول دون تسجيل دخول أو دون الترويسة', async () => {
    assert.equal((await call('GET', '/api/admin/stats')).status, 401);
    const noHeader = await fetch(base + '/api/admin/books', { method: 'POST', headers: { Cookie: adminCookie, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(noHeader.status, 403);
  });

  it('ترفض كلمة المرور الخاطئة', async () => {
    assert.equal((await call('POST', '/api/auth/login', { username: 'admin', password: 'wrong' })).status, 401);
  });

  it('تمنع أمينة المكتبة من الإعدادات والمستخدمين وتسمح بالمحتوى', async () => {
    assert.equal((await call('GET', '/api/admin/settings', undefined, librarianCookie)).status, 403);
    assert.equal((await call('GET', '/api/admin/users', undefined, librarianCookie)).status, 403);
    assert.equal((await call('GET', '/api/admin/books', undefined, librarianCookie)).status, 200);
  });

  it('تنفذ إضافة وتعديل وحذف كتاب مع التحقق', async () => {
    const invalid = await call('POST', '/api/admin/books', { title: '', copiesTotal: 1, copiesAvailable: 3 }, adminCookie);
    assert.equal(invalid.status, 400);
    const created = await call('POST', '/api/admin/books', { title: 'كتاب اختبار', author: 'مؤلف', copiesTotal: 2, copiesAvailable: 2, isActive: true }, adminCookie);
    assert.equal(created.status, 201);
    const id = created.body.id;
    const updated = await call('PUT', `/api/admin/books/${id}`, { ...created.body, title: 'كتاب معدل' }, adminCookie);
    assert.equal(updated.body.title, 'كتاب معدل');
    assert.equal((await call('DELETE', `/api/admin/books/${id}`, undefined, adminCookie)).status, 200);
    assert.equal((await call('GET', `/api/public/books/${id}`)).status, 404);
  });

  it('تحدّث رصيد النسخ عند تسليم وإرجاع الاستعارة', async () => {
    const book = (await call('POST', '/api/admin/books', { title: 'كتاب نسخة واحدة', copiesTotal: 1, copiesAvailable: 1 }, adminCookie)).body;
    const settings = (await call('GET', '/api/admin/settings', undefined, adminCookie)).body.settings;
    settings.borrow.mode = 'msforms';
    await call('PUT', '/api/admin/settings', settings, adminCookie);
    const req = await call('POST', '/api/forms/borrow/request', { bookId: book.id, specialty: 'الشبكات', borrowDate: '2030-02-01' });
    const loans = await call('GET', `/api/admin/loans?search=${req.body.referenceCode}`, undefined, adminCookie);
    const loanId = loans.body.items[0].id;

    await call('PATCH', `/api/admin/loans/${loanId}`, { status: 'borrowed' }, adminCookie);
    assert.equal((await call('GET', `/api/public/books/${book.id}`)).body.copiesAvailable, 0);
    const blocked = await call('POST', '/api/forms/borrow/request', { bookId: book.id, specialty: 'الشبكات', borrowDate: '2030-02-01' });
    assert.equal(blocked.status, 409);
    await call('PATCH', `/api/admin/loans/${loanId}`, { status: 'returned' }, adminCookie);
    assert.equal((await call('GET', `/api/public/books/${book.id}`)).body.copiesAvailable, 1);
  });

  it('ترفض رابط استبيان من خارج Microsoft Forms', async () => {
    const res = await call('POST', '/api/admin/surveys', { title: 'اختبار', startDate: '2030-01-01', endDate: '2030-01-05', formUrl: 'https://example.com' }, adminCookie);
    assert.equal(res.status, 400);
  });

  it('تعيد إحصائيات منفصلة لكل خدمة', async () => {
    const res = await call('GET', '/api/admin/stats?days=30', undefined, librarianCookie);
    assert.equal(res.status, 200);
    for (const key of ['overview', 'resources', 'books', 'loans', 'projects', 'surveys', 'visit']) assert.ok(res.body[key], key);
    assert.ok(res.body.loans.total >= 2);
    assert.ok(res.body.visit.reasons.some((r: any) => r.label === 'الوقت غير مناسب'));
  });

  it('تمنع حذف آخر حساب مسؤولة', async () => {
    const users = (await call('GET', '/api/admin/users', undefined, adminCookie)).body;
    const admin = users.find((u: any) => u.username === 'admin');
    const res = await call('PUT', `/api/admin/users/${admin.id}`, { role: 'librarian' }, adminCookie);
    assert.equal(res.status, 400);
  });

  it('تصدّر الاستعارات CSV دون بيانات شخصية', async () => {
    const res = await fetch(base + '/api/admin/loans-export.csv', { headers: { Cookie: adminCookie } });
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('الرمز المرجعي'));
    assert.equal(text.includes('0551234567'), false);
  });
});
