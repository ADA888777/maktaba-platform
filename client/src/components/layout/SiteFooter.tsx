import { Link } from 'react-router';
import { Clock, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import { mainNav } from '../../lib/services';
import { Logo } from '../ui/Misc';

export function SiteFooter() {
  const { config } = useConfig();
  const site = config?.site;
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo name={site?.libraryName ?? 'المكتبة الرقمية'} logoUrl={site?.logoUrl} />
          {site?.institutionName && <p className="mt-3 text-sm font-semibold text-ink-700">{site.institutionName}</p>}
          <p className="mt-3 max-w-sm text-sm leading-7 text-ink-600">
            منصة رقمية لخدمات المكتبة تتيح الوصول إلى المصادر والكتب وطلبات الاستعارة والمشاركة في الاستبيانات.
          </p>
          <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-ink-500">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
            البيانات الشخصية في النماذج تُرسل إلى نماذج المؤسسة الرسمية، ولا تُحفظ في قاعدة بيانات الموقع.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink-900">روابط سريعة</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {mainNav.map((i) => (
              <li key={i.to}>
                <Link to={i.to} className="text-ink-600 hover:text-brand-700">{i.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold text-ink-900">تواصل معنا</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-ink-600">
            {site?.location && (
              <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />{site.location}</li>
            )}
            {site?.workingHours && (
              <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />{site.workingHours}</li>
            )}
            {site?.contactEmail && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
                <a href={`mailto:${site.contactEmail}`} className="ltr hover:text-brand-700">{site.contactEmail}</a>
              </li>
            )}
            {!site?.location && !site?.workingHours && !site?.contactEmail && (
              <li className="text-ink-500">تُضاف بيانات التواصل من إعدادات لوحة التحكم.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-ink-500">
          <p>© {new Date().getFullYear()} {site?.libraryName ?? 'المكتبة الرقمية'}</p>
          <Link to="/admin" className="hover:text-brand-700">دخول الإدارة</Link>
        </div>
      </div>
    </footer>
  );
}
