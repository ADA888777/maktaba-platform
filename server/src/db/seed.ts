import crypto from 'node:crypto';
import { getDb, transaction } from './connection.js';
import {
  booksRepo, categoriesRepo, eventsRepo, loansRepo, projectsRepo, resourcesRepo, surveysRepo, visitResponsesRepo,
} from '../repositories/index.js';
import { trackEvent, todayKey } from '../services/analytics.js';
import { generateReferenceCode } from '../services/loans.js';
import { VISIT_FREQUENCIES, VISIT_REASONS, VISIT_SERVICES } from '../constants.js';
import { defaultSettings } from '../services/settings.js';

/**
 * بيانات أولية للمحتوى العام (كتب ومصادر حقيقية معروفة، ومشاريع وفعاليات نموذجية).
 * لا تحتوي على أي بيانات لطالبات. يمكن تعديلها أو حذفها من لوحة التحكم.
 */

const bookCats = ['تطوير الذات', 'إدارة وأعمال', 'تقنية المعلومات', 'أدب ورواية', 'تاريخ وفكر', 'تسويق', 'تصميم', 'علم النفس'];
const resourceCats = ['عام', 'تقنية', 'إدارة وأعمال', 'تعلم ذاتي', 'بحث علمي'];
const projectCats = ['تقنية', 'إدارة', 'تصميم', 'خدمة مجتمع'];

type SeedBook = [title: string, author: string, cat: string, specialty: string, copies: number, description: string, year: number | null];
const books: SeedBook[] = [
  ['العادات السبع للناس الأكثر فعالية', 'ستيفن ر. كوفي', 'تطوير الذات', '', 3, 'كتاب في الفعالية الشخصية والقيادة الذاتية يعرض سبع عادات لبناء الشخصية وتحقيق التوازن.', 1989],
  ['العادات الذرية', 'جيمس كلير', 'تطوير الذات', '', 2, 'دليل عملي لبناء العادات الجيدة والتخلص من العادات السيئة عبر تغييرات صغيرة متراكمة.', 2018],
  ['الذكاء العاطفي', 'دانييل جولمان', 'علم النفس', '', 2, 'يشرح دور الذكاء العاطفي في النجاح المهني والعلاقات، وكيف يمكن تنميته.', 1995],
  ['التفكير السريع والبطيء', 'دانيال كانمان', 'علم النفس', '', 1, 'رحلة في نظامي التفكير لدى الإنسان وأثرهما في اتخاذ القرارات.', 2011],
  ['الإدارة: المهام والمسؤوليات والممارسات', 'بيتر دراكر', 'إدارة وأعمال', 'التقنية الإدارية', 2, 'مرجع أساسي في علم الإدارة يتناول دور المدير ومسؤوليات المنظمات.', 1973],
  ['الأب الغني والأب الفقير', 'روبرت كيوساكي', 'إدارة وأعمال', 'المحاسبة', 2, 'مفاهيم مبسطة في الثقافة المالية وإدارة المال الشخصي.', 1997],
  ['مبادئ التسويق', 'فيليب كوتلر وغاري أرمسترونغ', 'تسويق', 'التسويق', 3, 'كتاب مرجعي يغطي أساسيات التسويق وسلوك المستهلك والمزيج التسويقي.', null],
  ['فن الحرب', 'سون تزو', 'تاريخ وفكر', '', 1, 'نص كلاسيكي في الاستراتيجية يُستشهد به كثيرًا في الإدارة والقيادة.', null],
  ['مقدمة ابن خلدون', 'عبد الرحمن بن خلدون', 'تاريخ وفكر', '', 1, 'من أشهر مؤلفات الفكر العربي، تتناول العمران البشري وأحوال المجتمعات.', null],
  ['الكود النظيف', 'روبرت سي. مارتن', 'تقنية المعلومات', 'تقنية البرمجيات', 2, 'مبادئ كتابة شيفرة برمجية واضحة وقابلة للصيانة، مع أمثلة تطبيقية.', 2008],
  ['شبكات الحاسب', 'أندرو تانينباوم', 'تقنية المعلومات', 'الشبكات', 2, 'مرجع شامل في مفاهيم الشبكات وطبقاتها وبروتوكولاتها.', null],
  ['مقدمة في الخوارزميات', 'توماس كورمن وآخرون', 'تقنية المعلومات', 'تقنية البرمجيات', 1, 'مرجع أكاديمي في تصميم الخوارزميات وتحليلها.', null],
  ['تصميم الأشياء اليومية', 'دون نورمان', 'تصميم', 'التصميم الجرافيكي', 1, 'كتاب في تجربة المستخدم ومبادئ التصميم المتمحور حول الإنسان.', 1988],
  ['ساق البامبو', 'سعود السنعوسي', 'أدب ورواية', '', 2, 'رواية عربية حائزة على الجائزة العالمية للرواية العربية عام 2013.', 2012],
  ['قواعد العشق الأربعون', 'إليف شافاق', 'أدب ورواية', '', 1, 'رواية تتناول سيرة جلال الدين الرومي وشمس التبريزي بأسلوب سردي متداخل.', 2009],
  ['أرض زيكولا', 'عمرو عبد الحميد', 'أدب ورواية', '', 1, 'رواية خيالية تدور في عالم يُتداول فيه الذكاء بدلًا من المال.', 2010],
];

type SeedResource = [name: string, url: string, type: string, specialty: string, cat: string, icon: string, description: string];
const resources: SeedResource[] = [
  ['المكتبة الرقمية السعودية', 'https://sdl.edu.sa', 'مكتبة رقمية', '', 'بحث علمي', 'library', 'بوابة وطنية تتيح الوصول إلى الكتب والدوريات وقواعد المعلومات لمنسوبي مؤسسات التعليم.'],
  ['الباحث العلمي من Google', 'https://scholar.google.com', 'محرك بحث أكاديمي', '', 'بحث علمي', 'search', 'محرك بحث متخصص في الأبحاث والرسائل العلمية والكتب الأكاديمية.'],
  ['دليل المجلات مفتوحة الوصول (DOAJ)', 'https://doaj.org', 'مجلات علمية', '', 'بحث علمي', 'newspaper', 'فهرس للمجلات العلمية المحكّمة المتاحة مجانًا في مختلف التخصصات.'],
  ['مؤسسة هنداوي', 'https://www.hindawi.org/books/', 'كتب إلكترونية', '', 'عام', 'book-open', 'مكتبة عربية مجانية تضم آلاف الكتب في الأدب والعلوم والفكر.'],
  ['مشروع غوتنبرغ', 'https://www.gutenberg.org', 'كتب إلكترونية', '', 'عام', 'book-open', 'مكتبة رقمية للكتب الكلاسيكية المتاحة للعامة، معظمها باللغة الإنجليزية.'],
  ['منصة دروب', 'https://doroob.sa', 'منصة تعليمية', '', 'تعلم ذاتي', 'graduation-cap', 'منصة وطنية للتدريب الإلكتروني تقدم دورات مهارية مجانية بشهادات.'],
  ['منصة إدراك', 'https://www.edraak.org', 'منصة تعليمية', '', 'تعلم ذاتي', 'graduation-cap', 'منصة عربية للمساقات الإلكترونية المفتوحة في مجالات متعددة.'],
  ['منصة رواق', 'https://www.rwaq.org', 'منصة تعليمية', '', 'تعلم ذاتي', 'video', 'مواد أكاديمية مجانية باللغة العربية يقدمها مختصون.'],
  ['أكاديمية خان بالعربية', 'https://ar.khanacademy.org', 'منصة تعليمية', '', 'تعلم ذاتي', 'video', 'دروس مرئية وتمارين تفاعلية في الرياضيات والعلوم والحاسب.'],
  ['arXiv', 'https://arxiv.org', 'قاعدة بيانات', 'تقنية البرمجيات', 'تقنية', 'flask', 'أرشيف مفتوح لأبحاث علوم الحاسب والرياضيات والفيزياء قبل النشر.'],
  ['W3Schools', 'https://www.w3schools.com', 'منصة تعليمية', 'تقنية البرمجيات', 'تقنية', 'file-text', 'دروس ومراجع مبسطة لتقنيات الويب ولغات البرمجة مع أمثلة تفاعلية.'],
  ['قاعدة معلومات ERIC', 'https://eric.ed.gov', 'قاعدة بيانات', '', 'بحث علمي', 'database', 'قاعدة بيانات للأبحاث التربوية والتعليمية، كثير من محتواها متاح بالنص الكامل.'],
  ['MIT OpenCourseWare', 'https://ocw.mit.edu', 'منصة تعليمية', 'الشبكات', 'تقنية', 'graduation-cap', 'مواد مقررات جامعية مفتوحة تشمل المحاضرات والواجبات والمراجع.'],
  ['قاعدة معلومات دار المنظومة', 'https://search.mandumah.com', 'قاعدة بيانات', 'التقنية الإدارية', 'إدارة وأعمال', 'database', 'قاعدة عربية للرسائل الجامعية والبحوث المحكمة (تتطلب اشتراك المؤسسة).'],
];

type SeedProject = [title: string, team: string, show: boolean, specialty: string, topic: string, type: string, cat: string, daysAgo: number, description: string];
const projects: SeedProject[] = [
  ['نظام حجز مواعيد إلكتروني', 'فريق مسار', true, 'تقنية البرمجيات', 'تطوير تطبيقات الويب', 'مشروع تخرج', 'تقنية', 40, 'تطبيق ويب لتنظيم حجز المواعيد وإرسال التذكيرات، مع لوحة لإدارة الأوقات المتاحة.'],
  ['دليل رقمي لخدمات المكتبة', '', false, 'التقنية الإدارية', 'التحول الرقمي', 'مبادرة', 'إدارة', 65, 'دليل تفاعلي يعرّف المستفيدات بخدمات المكتبة وطريقة الوصول إليها خطوة بخطوة.'],
  ['هوية بصرية لمبادرة القراءة', 'فريق حروف', true, 'التصميم الجرافيكي', 'الهوية البصرية', 'مشروع تخرج', 'تصميم', 90, 'تصميم شعار وألوان ومطبوعات لمبادرة تشجيع القراءة داخل المنشأة التدريبية.'],
  ['قياس احتياجات المتدربات من المصادر الإلكترونية', '', false, 'التسويق', 'البحث والاستطلاع', 'بحث', 'إدارة', 120, 'دراسة ميدانية لتحديد المصادر الأكثر طلبًا ومعوقات استخدامها.'],
  ['تصميم شبكة معمل حاسب', 'فريق اتصال', true, 'الشبكات', 'البنية التحتية', 'مشروع تخرج', 'تقنية', 150, 'محاكاة شبكة معمل حاسب متكاملة مع تقسيم الشبكات الفرعية وإعدادات الأمان.'],
  ['خطة تسويقية لأسبوع المكتبة', '', false, 'التسويق', 'التسويق الرقمي', 'مبادرة', 'خدمة مجتمع', 20, 'خطة محتوى وحملة توعوية لرفع حضور فعاليات أسبوع المكتبة.'],
  ['نظام أرشفة المستندات', 'فريق أرشيف', true, 'السكرتارية التنفيذية', 'إدارة الوثائق', 'مشروع تخرج', 'إدارة', 200, 'تصور لنظام أرشفة إلكتروني يسهّل حفظ المستندات واسترجاعها.'],
];

function daysFromNow(days: number, hourRiyadh: number, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourRiyadh - 3, minute, 0, 0); // توقيت الرياض = UTC+3
  return d.toISOString();
}

function nextWeekday(weekday: number) {
  // 0 = الأحد
  const now = new Date();
  const riyadh = new Date(now.getTime() + 3 * 3600000);
  let diff = (weekday - riyadh.getUTCDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return diff;
}

/** مولد أرقام شبه عشوائية ثابت لتكون البيانات التجريبية قابلة للتكرار */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function seedContent() {
  const cat = new Map<string, number>();
  bookCats.forEach((n) => cat.set(`book:${n}`, categoriesRepo.create(n, 'book').id));
  resourceCats.forEach((n) => cat.set(`resource:${n}`, categoriesRepo.create(n, 'resource').id));
  projectCats.forEach((n) => cat.set(`project:${n}`, categoriesRepo.create(n, 'project').id));

  for (const [title, author, c, specialty, copies, description, year] of books) {
    booksRepo.create({
      title, author, specialty, description, publishedYear: year,
      categoryId: cat.get(`book:${c}`) ?? null,
      coverUrl: '', publisher: '', copiesTotal: copies, copiesAvailable: copies, isActive: true,
    });
  }
  for (const [name, url, resourceType, specialty, c, icon, description] of resources) {
    resourcesRepo.create({
      name, url, resourceType, specialty, icon, description, imageUrl: '', isActive: true,
      categoryId: cat.get(`resource:${c}`) ?? null,
    });
  }
  for (const [title, teamName, showTeam, specialty, topic, projectType, c, daysAgo, description] of projects) {
    projectsRepo.create({
      title, teamName, showTeam, specialty, topic, projectType, description,
      projectDate: todayKey(new Date(Date.now() - daysAgo * 86400000)),
      categoryId: cat.get(`project:${c}`) ?? null, imageUrl: '', fileUrl: '', isPublished: true,
    });
  }

  const events: Array<Parameters<typeof eventsRepo.create>[0]> = [
    {
      title: 'مشروع التحول الرقمي في المكتبة',
      description: 'عرض لمراحل تحويل خدمات المكتبة إلى منصة رقمية، وآلية الاستفادة من المصادر الإلكترونية ونماذج الاستعارة.',
      startsAt: daysFromNow(nextWeekday(0), 10), endsAt: daysFromNow(nextWeekday(0), 12),
      location: 'قاعة التدريب', department: 'المكتبة', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
    {
      title: 'ورشة: البحث في قواعد البيانات العلمية',
      description: 'ورشة تطبيقية عن طرق البحث المتقدم في المكتبة الرقمية السعودية ومحركات البحث الأكاديمية.',
      startsAt: daysFromNow(1, 11), endsAt: daysFromNow(1, 12, 30),
      location: 'معمل الحاسب', department: 'المكتبة', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
    {
      title: 'معرض مشاريع التخرج',
      description: 'معرض لعرض مشاريع التخرج المقدمة للمكتبة من مختلف التخصصات.',
      startsAt: daysFromNow(10, 9), endsAt: daysFromNow(10, 13),
      location: 'بهو المبنى الرئيسي', department: 'شؤون المتدربات', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
    {
      title: 'مسابقة القراءة الشهرية',
      description: 'مسابقة لتشجيع القراءة؛ تُعلن تفاصيلها والكتب المشمولة في المكتبة.',
      startsAt: daysFromNow(25, 10), endsAt: null,
      location: 'المكتبة', department: 'النشاط الطلابي', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
    {
      title: 'لقاء تعريفي بخدمات المكتبة',
      description: 'لقاء للمتدربات المستجدات للتعريف بخدمات المكتبة وطريقة الاستعارة.',
      startsAt: daysFromNow(-12, 10), endsAt: daysFromNow(-12, 11),
      location: 'المكتبة', department: 'المكتبة', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
    {
      title: 'ورشة التوثيق العلمي للمراجع',
      description: 'ورشة عن أساليب توثيق المراجع في التقارير ومشاريع التخرج.',
      startsAt: daysFromNow(-30, 12), endsAt: daysFromNow(-30, 13, 30),
      location: 'قاعة التدريب', department: 'قسم الإدارة', specialty: '', imageUrl: '', status: 'scheduled', isPublished: true,
    },
  ];
  events.forEach((e) => eventsRepo.create(e));

  const today = todayKey();
  const shift = (days: number) => todayKey(new Date(Date.now() + days * 86400000));
  surveysRepo.create({
    title: 'استبيان رضا المستفيدات عن خدمات المكتبة',
    description: 'نسعد بمعرفة رأيك في خدمات المكتبة الحالية واقتراحاتك لتطويرها.',
    startDate: shift(-5), endDate: shift(20), formUrl: '', reportedResponses: null, isPublished: true,
  });
  surveysRepo.create({
    title: 'استبيان احتياجات المصادر الإلكترونية',
    description: 'ساعدينا في اختيار المصادر الإلكترونية والكتب التي تحتاجينها في تخصصك.',
    startDate: today, endDate: shift(30), formUrl: '', reportedResponses: null, isPublished: true,
  });
  surveysRepo.create({
    title: 'تقييم فعالية اللقاء التعريفي',
    description: 'تقييم اللقاء التعريفي بخدمات المكتبة.',
    startDate: shift(-12), endDate: shift(-5), formUrl: '', reportedResponses: null, isPublished: true,
  });
}

/** إحصائيات تجريبية (معلَّمة is_demo) لإظهار الرسوم البيانية؛ تُحذف بزر واحد من الإعدادات */
export function seedDemoAnalytics() {
  const rand = rng(20260916);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const resourceIds = resourcesRepo.list({ pageSize: 200 }).items.map((r) => r.id);
  const bookList = booksRepo.list({ pageSize: 200 }).items;
  const surveyIds = surveysRepo.list({ pageSize: 50 }).items.map((s) => s.id);
  const specialties = defaultSettings.lists.specialties.filter((s) => s !== 'أخرى');
  const pages = ['/', '/resources', '/books', '/projects', '/events', '/surveys', '/visit'];
  const db = getDb();

  for (let day = 89; day >= 0; day--) {
    const base = new Date(Date.now() - day * 86400000);
    const weekday = base.getUTCDay();
    const weekend = weekday === 5 || weekday === 6;
    const growth = 1 + (89 - day) / 120;
    const visitors = Math.round((weekend ? 6 : 18) * growth * (0.7 + rand() * 0.6));
    for (let v = 0; v < visitors; v++) {
      const session = crypto.randomUUID();
      const at = new Date(base.getTime() - rand() * 8 * 3600000);
      const views = 1 + Math.floor(rand() * 4);
      for (let i = 0; i < views; i++) {
        const path = i === 0 ? '/' : pick(pages);
        trackEvent({ type: 'page_view', path, sessionId: session, isDemo: true, at });
        if (path === '/resources') {
          trackEvent({ type: 'resources_visit', isDemo: true, at });
          if (rand() < 0.7) {
            const idx = Math.floor(Math.pow(rand(), 1.8) * resourceIds.length);
            trackEvent({ type: 'resource_open', targetId: resourceIds[idx], isDemo: true, at });
          }
        }
        if (path === '/books') trackEvent({ type: 'books_visit', isDemo: true, at });
        if (path === '/projects') trackEvent({ type: 'projects_visit', isDemo: true, at });
        if (path === '/events') trackEvent({ type: 'events_visit', isDemo: true, at });
        if (path === '/visit') trackEvent({ type: 'visit_page', isDemo: true, at });
        if (path === '/surveys') {
          trackEvent({ type: 'surveys_visit', isDemo: true, at });
          if (rand() < 0.35 && surveyIds.length) trackEvent({ type: 'survey_open', targetId: pick(surveyIds), isDemo: true, at });
        }
      }
    }
  }

  // طلبات استعارة تجريبية (مجهولة)
  const borrowable = bookList.filter((b) => b.copiesTotal > 0);
  for (let i = 0; i < 46; i++) {
    const book = borrowable[Math.floor(Math.pow(rand(), 1.6) * borrowable.length)];
    const daysAgo = Math.floor(rand() * 85);
    const created = new Date(Date.now() - daysAgo * 86400000);
    const borrowDate = todayKey(created);
    const ret = todayKey(new Date(created.getTime() + 14 * 86400000));
    let status: 'requested' | 'borrowed' | 'returned' | 'cancelled' = daysAgo > 20 ? 'returned' : daysAgo > 3 ? 'borrowed' : 'requested';
    if (rand() < 0.06) status = 'cancelled';
    if (status === 'borrowed') {
      const res = db.prepare('UPDATE books SET copies_available = copies_available - 1 WHERE id = ? AND copies_available > 0').run(book.id);
      if (Number(res.changes) === 0) status = 'returned';
    }
    const loan = loansRepo.create({
      referenceCode: generateReferenceCode(), bookId: book.id, bookTitle: book.title, specialty: pick(specialties),
      borrowDate, expectedReturnDate: ret, status, channel: 'msforms', isDemo: true,
    });
    db.prepare('UPDATE loans SET created_at = ?, updated_at = ? WHERE id = ?').run(created.toISOString(), created.toISOString(), loan.id);
    trackEvent({ type: 'borrow_start', targetId: book.id, isDemo: true, at: created });
  }

  // إجابات تجريبية لاستطلاع الزيارة
  const reasonWeights = [0.45, 0.3, 0.35, 0.15, 0.4, 0.3, 0.05];
  for (let i = 0; i < 64; i++) {
    const hasVisited = rand() < 0.42;
    const reasons = hasVisited ? [] : VISIT_REASONS.filter((_, idx) => rand() < reasonWeights[idx]);
    if (!hasVisited && reasons.length === 0) reasons.push(VISIT_REASONS[0]);
    visitResponsesRepo.create({
      hasVisited,
      specialty: pick(specialties),
      reasons,
      mainService: VISIT_SERVICES[Math.floor(Math.pow(rand(), 1.4) * (VISIT_SERVICES.length - 1))],
      visitFrequency: hasVisited ? pick(VISIT_FREQUENCIES) : '',
      isDemo: true,
      createdAt: new Date(Date.now() - rand() * 60 * 86400000).toISOString(),
    });
  }
}

export function seedIfEmpty(opts: { demoAnalytics: boolean }) {
  const empty = categoriesRepo.list().length === 0 && booksRepo.count() === 0 && resourcesRepo.count() === 0;
  if (!empty) return false;
  transaction(() => {
    seedContent();
    if (opts.demoAnalytics) seedDemoAnalytics();
  });
  console.log(`[seed] تمت تعبئة المحتوى الأولي${opts.demoAnalytics ? ' مع إحصائيات تجريبية' : ''}.`);
  return true;
}
