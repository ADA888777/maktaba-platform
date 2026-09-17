export type Errors = Record<string, string>;

export const rules = {
  name: (v: string) => (v.trim().length < 3 ? 'الاسم مطلوب (3 أحرف على الأقل)' : !/^[\p{L}\s.'-]+$/u.test(v.trim()) ? 'الاسم يجب أن يحتوي على حروف فقط' : ''),
  traineeId: (v: string) => (!/^\d{5,15}$/.test(v.trim()) ? 'الرقم التدريبي يجب أن يتكون من 5 إلى 15 رقمًا' : ''),
  email: (v: string, required: boolean) =>
    !v.trim() ? (required ? 'البريد الإلكتروني مطلوب' : '') : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'بريد إلكتروني غير صالح' : '',
  phone: (v: string, required: boolean) =>
    !v.trim() ? (required ? 'رقم الجوال مطلوب' : '') : !/^05\d{8}$/.test(v.trim()) ? 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام' : '',
  required: (v: string, label: string) => (!v.trim() ? `${label} مطلوب` : ''),
};

export const clean = (errors: Errors) => Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Errors;

/** تحويل الأرقام العربية الهندية إلى أرقام لاتينية */
export const toLatinDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

export function focusFirstError(errors: Errors) {
  const first = Object.keys(errors)[0];
  if (!first) return;
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}
