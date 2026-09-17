import { useEffect, useState } from 'react';
import { BookMarked, Download, SearchX, ShieldCheck, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import type { ListResult, Loan, LoanStatus } from '../../lib/types';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useUrlState } from '../../hooks/useUrlState';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { DataTable } from '../../components/admin/DataTable';
import { SearchInput, Select } from '../../components/ui/Field';
import { Alert, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { Badge, Pagination, Tabs } from '../../components/ui/Misc';
import { IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/Modal';
import { fmtDate, todayISO } from '../../lib/format';
import { statusLabels } from './stats-shared';

const tones: Record<LoanStatus, 'blue' | 'teal' | 'green' | 'gray'> = { requested: 'blue', borrowed: 'teal', returned: 'green', cancelled: 'gray' };
const channelLabel = { msforms: 'Microsoft Forms', flow: 'Power Automate', sink: 'وضع التجربة' };

export default function LoansAdmin() {
  const toast = useToast();
  const { config } = useConfig();
  const [q, setQ] = useUrlState({ status: '', specialty: '', overdue: '', page: '1' });
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Loan | null>(null);

  useEffect(() => { if (debounced) setQ({ page: '1' }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useAsync(
    () => api.get<ListResult<Loan>>('/admin/loans', { ...q, search: debounced, pageSize: 20 }),
    [q.status, q.specialty, q.overdue, q.page, debounced],
  );

  const changeStatus = async (loan: Loan, status: LoanStatus) => {
    setBusyId(loan.id);
    try {
      const updated = await api.patch<Loan>(`/admin/loans/${loan.id}`, { status });
      list.setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === loan.id ? updated : x)) } : d));
      toast(`تم تحديث حالة الطلب ${loan.referenceCode} إلى «${statusLabels[status]}»`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const today = todayISO();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الاستعارات</h1>
          {list.data && <p className="mt-1 text-sm text-ink-600">الإجمالي: {list.data.total}</p>}
        </div>
        <a href="/api/admin/loans-export.csv" className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700 hover:border-brand-400">
          <Download className="size-4" /> تصدير CSV
        </a>
      </div>

      <Alert tone="info" title="سجلات مجهولة الهوية">
        <span className="inline-flex items-start gap-1">
          <ShieldCheck className="mt-1 size-4 shrink-0" />
          لا يحفظ الموقع بيانات المستعيرات. ابحثي بالرمز المرجعي الموجود في ردود نموذج Microsoft Forms لمطابقة الطلب، ثم حدّثي الحالة هنا؛ رصيد النسخ يتحدث تلقائيًا عند التسليم والإرجاع.
        </span>
      </Alert>

      <Tabs
        value={q.overdue ? 'overdue' : q.status || 'all'}
        onChange={(v) => setQ(v === 'overdue' ? { overdue: 'true', status: '', page: '1' } : { status: v === 'all' ? '' : v, overdue: '', page: '1' })}
        items={[
          { value: 'all', label: 'الكل' },
          { value: 'requested', label: 'طلبات جديدة' },
          { value: 'borrowed', label: 'مستعارة' },
          { value: 'overdue', label: 'متأخرة' },
          { value: 'returned', label: 'تم الإرجاع' },
          { value: 'cancelled', label: 'ملغاة' },
        ]}
      />

      <div className="card grid gap-3 p-3 sm:grid-cols-[2fr_1fr] sm:p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحثي بالرمز المرجعي أو اسم الكتاب..." />
        <Select aria-label="التخصص" className="h-12" placeholder="كل التخصصات" options={config?.lists.specialties ?? []} value={q.specialty} onChange={(e) => setQ({ specialty: e.target.value, page: '1' })} />
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Spinner />
      ) : !list.data?.items.length ? (
        <EmptyState icon={debounced ? SearchX : BookMarked} title={debounced ? 'لا يوجد طلب بهذا الرمز' : 'لا توجد طلبات استعارة'} />
      ) : (
        <>
          <DataTable<Loan>
            rows={list.data.items}
            loading={list.loading}
            columns={[
              {
                key: 'ref', header: 'الرمز المرجعي', primary: true,
                render: (l) => (
                  <span className="flex flex-wrap items-center gap-2">
                    <span dir="ltr" className="font-mono text-sm font-bold text-brand-800">{l.referenceCode}</span>
                    {l.isDemo && <Badge tone="amber">تجريبي</Badge>}
                  </span>
                ),
              },
              { key: 'book', header: 'الكتاب', render: (l) => <span className="font-medium">{l.bookTitle}</span> },
              { key: 'specialty', header: 'التخصص', render: (l) => l.specialty || '—' },
              {
                key: 'dates', header: 'الاستعارة ← الإرجاع',
                render: (l) => (
                  <span className="text-xs">
                    {fmtDate(l.borrowDate)}<br />
                    <span className={l.status === 'borrowed' && l.expectedReturnDate && l.expectedReturnDate < today ? 'font-bold text-danger-700' : 'text-ink-500'}>
                      {l.expectedReturnDate ? fmtDate(l.expectedReturnDate) : 'غير محدد'}
                    </span>
                  </span>
                ),
              },
              { key: 'channel', header: 'القناة', hideOnMobile: true, render: (l) => <span className="text-xs text-ink-500">{channelLabel[l.channel]}</span> },
              {
                key: 'status', header: 'الحالة',
                render: (l) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tones[l.status]} dot>{statusLabels[l.status]}</Badge>
                    <select
                      aria-label={`تغيير حالة ${l.referenceCode}`}
                      disabled={busyId === l.id}
                      value={l.status}
                      onChange={(e) => void changeStatus(l, e.target.value as LoanStatus)}
                      className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-xs"
                    >
                      {(['requested', 'borrowed', 'returned', 'cancelled'] as LoanStatus[]).map((s) => (
                        <option key={s} value={s}>{statusLabels[s]}</option>
                      ))}
                    </select>
                  </div>
                ),
              },
            ]}
            actions={(l) => (
              <IconButton label={`حذف ${l.referenceCode}`} tone="danger" onClick={() => setDeleting(l)}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          />
          <Pagination page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onChange={(p) => setQ({ page: String(p) })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="حذف سجل الاستعارة"
        message={<>سيُحذف السجل <strong dir="ltr">{deleting?.referenceCode}</strong> من الإحصائيات. إن كان الكتاب مستعارًا فستُعاد النسخة إلى الرصيد.</>}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/admin/loans/${deleting.id}`);
            toast('تم حذف السجل');
            void list.reload();
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
    </div>
  );
}
