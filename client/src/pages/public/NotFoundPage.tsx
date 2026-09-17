import { Compass } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <div className="brand-gradient flex size-20 items-center justify-center rounded-3xl text-white">
        <Compass className="size-10" aria-hidden />
      </div>
      <h1 className="mt-6 text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-3 max-w-md leading-8 text-ink-600">قد يكون الرابط غير صحيح أو أن الصفحة نُقلت. يمكنك العودة للرئيسية ومتابعة التصفح.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/" variant="primary">الصفحة الرئيسية</ButtonLink>
        <ButtonLink to="/resources" variant="outline">المصادر الإلكترونية</ButtonLink>
      </div>
    </div>
  );
}
