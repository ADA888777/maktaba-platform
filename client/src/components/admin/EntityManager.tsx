import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Pencil, Plus, SearchX, Trash2, type LucideIcon } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../lib/api';
import type { ListResult } from '../../lib/types';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { Button, IconButton } from '../ui/Button';
import { SearchInput, Select } from '../ui/Field';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { EmptyState, ErrorState, Spinner, Alert } from '../ui/Feedback';
import { Pagination } from '../ui/Misc';
import { DataTable, type Column } from './DataTable';
import { FormFields, type FieldDef, type Values } from './FormFields';

export interface FilterDef {
  name: string;
  label: string;
  options: (string | { value: string; label: string })[];
}

/**
 * مدير محتوى عام: قائمة + بحث + تصفية + إضافة + تعديل + حذف.
 * يُستخدم للكتب والمصادر والمشاريع والفعاليات والاستبيانات.
 */
export function EntityManager<T extends { id: number }>({
  endpoint, title, singular, icon, columns, fields, filters = [], emptyValues, toForm, fromForm, validate, searchPlaceholder,
  intro, rowTitle, extraQuery,
}: {
  endpoint: string;
  title: string;
  singular: string;
  icon: LucideIcon;
  columns: Column<T>[];
  fields: FieldDef[] | ((values: Values) => FieldDef[]);
  filters?: FilterDef[];
  emptyValues: Values;
  toForm?: (row: T) => Values;
  fromForm?: (values: Values) => Values;
  validate?: (values: Values) => Record<string, string>;
  searchPlaceholder?: string;
  intro?: ReactNode;
  rowTitle: (row: T) => string;
  extraQuery?: Record<string, string>;
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [editing, setEditing] = useState<{ id?: number; values: Values } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<T | null>(null);

  useEffect(() => setPage(1), [debounced, filterValues]);

  // فتح نموذج الإضافة مباشرة عند القدوم من «إجراءات سريعة»
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing({ values: { ...emptyValues } });
      setParams((p) => { p.delete('new'); return p; }, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useAsync(
    () => api.get<ListResult<T>>(endpoint, { search: debounced, page, pageSize: 15, ...filterValues, ...extraQuery }),
    [endpoint, debounced, page, JSON.stringify(filterValues), JSON.stringify(extraQuery)],
  );

  const openCreate = () => {
    setErrors({});
    setFormError('');
    setEditing({ values: { ...emptyValues } });
  };
  const openEdit = (row: T) => {
    setErrors({});
    setFormError('');
    setEditing({ id: row.id, values: toForm ? toForm(row) : { ...row } });
  };

  const save = async () => {
    if (!editing) return;
    const localErrors = validate?.(editing.values) ?? {};
    const cleaned = Object.fromEntries(Object.entries(localErrors).filter(([, v]) => v));
    setErrors(cleaned);
    if (Object.keys(cleaned).length) {
      setFormError('يرجى تصحيح الحقول المشار إليها');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body = fromForm ? fromForm(editing.values) : editing.values;
      if (editing.id) await api.put(`${endpoint}/${editing.id}`, body);
      else await api.post(endpoint, body);
      toast(editing.id ? `تم حفظ تعديلات ${singular}` : `تمت إضافة ${singular} بنجاح`);
      setEditing(null);
      void list.reload();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await api.delete(`${endpoint}/${deleting.id}`);
      toast(`تم حذف ${singular}`);
      void list.reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const hasFilters = Boolean(debounced || Object.values(filterValues).some(Boolean));
  const fieldDefs = editing ? (typeof fields === 'function' ? fields(editing.values) : fields) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {list.data && <p className="mt-1 text-sm text-ink-600">الإجمالي: {list.data.total}</p>}
        </div>
        <Button variant="gradient" icon={<Plus className="size-5" />} onClick={openCreate}>
          إضافة {singular}
        </Button>
      </div>
      {intro}

      <div
        className="card grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-[var(--cols)]"
        style={{ '--cols': `2fr repeat(${filters.length}, minmax(0, 1fr))` } as React.CSSProperties}
      >
        <div className={filters.length % 2 === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}>
          <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder ?? 'بحث...'} />
        </div>
        {filters.map((f) => (
          <Select
            key={f.name}
            aria-label={f.label}
            className="h-12"
            placeholder={`${f.label}: الكل`}
            options={f.options}
            value={filterValues[f.name] ?? ''}
            onChange={(e) => setFilterValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        ))}
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Spinner />
      ) : !list.data?.items.length ? (
        hasFilters ? (
          <EmptyState icon={SearchX} title="لا توجد نتائج مطابقة" />
        ) : (
          <EmptyState icon={icon} title={`لا توجد بيانات في ${title} بعد`} description={`ابدئي بإضافة ${singular} جديد.`}
            action={<Button variant="primary" icon={<Plus className="size-4" />} onClick={openCreate}>إضافة {singular}</Button>} />
        )
      ) : (
        <>
          <DataTable
            rows={list.data.items}
            columns={columns}
            loading={list.loading}
            actions={(row) => (
              <>
                <IconButton label={`تعديل ${rowTitle(row)}`} onClick={() => openEdit(row)}><Pencil className="size-4" /></IconButton>
                <IconButton label={`حذف ${rowTitle(row)}`} tone="danger" onClick={() => setDeleting(row)}><Trash2 className="size-4" /></IconButton>
              </>
            )}
          />
          <Pagination page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => !saving && setEditing(null)}
        title={editing?.id ? `تعديل ${singular}` : `إضافة ${singular}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>إلغاء</Button>
            <Button variant="primary" loading={saving} onClick={() => void save()}>
              {editing?.id ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </>
        }
      >
        {formError && <Alert tone="error" className="mb-4">{formError}</Alert>}
        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <FormFields
              fields={fieldDefs}
              values={editing.values}
              errors={errors}
              onChange={(name, value) => {
                setEditing((cur) => (cur ? { ...cur, values: { ...cur.values, [name]: value } } : cur));
                if (errors[name]) setErrors((er) => ({ ...er, [name]: '' }));
              }}
            />
            <button type="submit" hidden />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`حذف ${singular}`}
        message={<>هل أنتِ متأكدة من حذف «<strong>{deleting ? rowTitle(deleting) : ''}</strong>»؟ لا يمكن التراجع عن هذا الإجراء.</>}
      />
    </div>
  );
}
