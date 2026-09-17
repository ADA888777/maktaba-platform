import { useState } from 'react';
import { Eraser, ShieldCheck, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import type { DashboardStats } from '../../../lib/types';
import { useAsync } from '../../../hooks/useAsync';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Feedback';
import { ConfirmDialog } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Field';

export function DataSettings() {
  const toast = useToast();
  const stats = useAsync(() => api.get<DashboardStats>('/admin/stats', { days: 'all' }), []);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [phrase, setPhrase] = useState('');
  const demo = stats.data?.demoData;
  const demoTotal = demo ? demo.events + demo.loans + demo.visitResponses : 0;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Eraser className="size-5 text-teal-700" /> البيانات التجريبية</h2>
        <p className="text-sm leading-7 text-ink-600">
          عند التشغيل الأول تُضاف إحصائيات تجريبية معلَّمة لتوضيح لوحة التحكم. احذفيها قبل الإطلاق الفعلي؛ لن يتأثر المحتوى (الكتب، المصادر، المشاريع).
        </p>
        {demo && (
          <ul className="grid grid-cols-3 gap-2 text-center text-sm">
            <li className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-bold">{demo.events}</p><p className="text-xs text-ink-500">حدث استخدام</p></li>
            <li className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-bold">{demo.loans}</p><p className="text-xs text-ink-500">طلب استعارة</p></li>
            <li className="rounded-xl bg-ink-50 p-3"><p className="text-lg font-bold">{demo.visitResponses}</p><p className="text-xs text-ink-500">إجابة استطلاع</p></li>
          </ul>
        )}
        <Button variant="outline" disabled={!demoTotal} onClick={() => setConfirmDemo(true)} icon={<Eraser className="size-4" />}>
          {demoTotal ? 'حذف البيانات التجريبية' : 'لا توجد بيانات تجريبية'}
        </Button>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Trash2 className="size-5 text-danger-700" /> تصفير إحصائيات الاستخدام</h2>
        <p className="text-sm leading-7 text-ink-600">يحذف جميع أحداث الزيارات وفتح المصادر والمشاركات. لا يحذف سجلات الاستعارة أو إجابات استطلاع الزيارة.</p>
        <Button variant="danger" onClick={() => { setPhrase(''); setConfirmReset(true); }} icon={<Trash2 className="size-4" />}>تصفير الإحصائيات</Button>
      </section>

      <section className="card space-y-3 p-5 sm:p-6 xl:col-span-2">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="size-5 text-teal-700" /> الفصل بين الإحصائيات والبيانات الشخصية</h2>
        <ul className="list-disc space-y-1 ps-5 text-sm leading-7 text-ink-700">
          <li><strong>الإحصائيات:</strong> أحداث مجهولة (نوع الحدث، العنصر، اليوم) ومعرّف زائر مُجزّأ يتغير يوميًا — لا عناوين IP ولا أسماء.</li>
          <li><strong>الاستعارات:</strong> الكتاب والتخصص والتواريخ والرمز المرجعي فقط.</li>
          <li><strong>البيانات الشخصية:</strong> في Microsoft Forms / Power Automate بحساب المؤسسة فقط، ولا تمر عبر قاعدة بيانات الموقع.</li>
        </ul>
      </section>

      <ConfirmDialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        title="حذف البيانات التجريبية"
        confirmLabel="حذف"
        message="ستُحذف جميع البيانات المعلَّمة كتجريبية وتُعاد النسخ المستعارة تجريبيًا إلى الرصيد."
        onConfirm={async () => {
          try {
            await api.post('/admin/settings/clear-demo');
            toast('تم حذف البيانات التجريبية');
            void stats.reload();
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="تصفير الإحصائيات"
        confirmLabel="تصفير نهائي"
        message={
          <div className="space-y-3">
            <Alert tone="error">لا يمكن التراجع عن هذا الإجراء.</Alert>
            <Input label='اكتبي كلمة "حذف" للتأكيد' required value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          </div>
        }
        onConfirm={async () => {
          if (phrase.trim() !== 'حذف') {
            toast('اكتبي كلمة "حذف" للتأكيد', 'error');
            throw new Error('unconfirmed');
          }
          try {
            await api.post('/admin/settings/reset-analytics', { confirm: 'حذف' });
            toast('تم تصفير الإحصائيات');
            void stats.reload();
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
    </div>
  );
}
