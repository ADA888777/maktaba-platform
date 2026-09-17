import { api } from '../../lib/api';
import type { DashboardStats } from '../../lib/types';
import { useAsync } from '../../hooks/useAsync';
import { Alert } from '../../components/ui/Feedback';
import { Link } from 'react-router';

export const RANGES = [
  { value: '7', label: '7 أيام' },
  { value: '30', label: '30 يومًا' },
  { value: '90', label: '90 يومًا' },
  { value: '365', label: 'سنة' },
  { value: 'all', label: 'الكل' },
];

export function useStats(days: string) {
  return useAsync(() => api.get<DashboardStats>('/admin/stats', { days }), [days]);
}

export function RangePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="الفترة الزمنية" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-ink-200">
      {RANGES.map((r) => (
        <button
          key={r.value}
          role="radio"
          aria-checked={value === r.value}
          onClick={() => onChange(r.value)}
          className={`h-8 shrink-0 rounded-lg px-3 text-sm font-semibold transition-colors ${value === r.value ? 'bg-brand-800 text-white' : 'text-ink-600 hover:bg-ink-100'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function DemoDataNotice({ stats, canManage }: { stats?: DashboardStats; canManage: boolean }) {
  const d = stats?.demoData;
  if (!d || d.events + d.loans + d.visitResponses === 0) return null;
  return (
    <Alert tone="warning" title="تتضمن الإحصائيات بيانات تجريبية">
      أُضيفت بيانات تجريبية لتوضيح الرسوم البيانية. {canManage ? (
        <>يمكن حذفها بزر واحد من <Link to="/admin/settings?tab=data" className="font-bold underline">الإعدادات ← البيانات</Link> قبل الإطلاق الفعلي.</>
      ) : 'يمكن لمسؤولة النظام حذفها من الإعدادات.'}
    </Alert>
  );
}

export const statusLabels: Record<string, string> = {
  requested: 'طلب جديد',
  borrowed: 'مستعار',
  returned: 'تم الإرجاع',
  cancelled: 'ملغي',
};
