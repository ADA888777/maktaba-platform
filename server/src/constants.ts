/** خيارات ثابتة لاستطلاع زيارة المكتبة — تُرسل للواجهة ويُتحقق منها في الخادم */
export const VISIT_REASONS = [
  'أفضل استخدام المصادر الإلكترونية',
  'لا أحتاج زيارة المكتبة حاليًا',
  'الوقت غير مناسب',
  'بُعد المكتبة',
  'لا أعرف الخدمات الموجودة',
  'أستخدم الكتب الإلكترونية أكثر',
  'سبب آخر',
] as const;

export const VISIT_SERVICES = [
  'قراءة الكتب الإلكترونية',
  'البحث عن مصادر',
  'استعارة الكتب',
  'الاطلاع على المشاريع',
  'الاستبيانات',
  'خدمة أخرى',
] as const;

export const VISIT_FREQUENCIES = ['مرة واحدة', 'شهريًا', 'أسبوعيًا', 'عدة مرات أسبوعيًا'] as const;

export const RESOURCE_ICONS = ['globe', 'library', 'database', 'book-open', 'graduation-cap', 'newspaper', 'search', 'file-text', 'video', 'flask'] as const;
