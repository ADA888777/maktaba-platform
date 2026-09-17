import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import type { Category } from '../../../lib/types';
import { useAsync } from '../../../hooks/useAsync';
import { useToast } from '../../../context/ToastContext';
import { Spinner, ErrorState } from '../../../components/ui/Feedback';
import { IconButton } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/Modal';

const kinds: { kind: Category['kind']; title: string }[] = [
  { kind: 'book', title: 'تصنيفات الكتب' },
  { kind: 'resource', title: 'تصنيفات المصادر الإلكترونية' },
  { kind: 'project', title: 'تصنيفات المشاريع' },
];

export function CategoriesSettings() {
  const list = useAsync(() => api.get<Category[]>('/admin/categories'), []);
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (!list.data) return <Spinner />;
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {kinds.map((k) => (
        <CategoryGroup key={k.kind} {...k} items={list.data!.filter((c) => c.kind === k.kind)} reload={list.reload} />
      ))}
    </div>
  );
}

function CategoryGroup({ kind, title, items, reload }: { kind: Category['kind']; title: string; items: Category[]; reload: () => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast(msg);
      await reload();
      return true;
    } catch (e) {
      toast(errorMessage(e), 'error');
      return false;
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">{title}</h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim() && (await run(() => api.post('/admin/categories', { name: name.trim(), kind }), 'تمت إضافة التصنيف'))) setName('');
        }}
      >
        <input aria-label={`تصنيف جديد في ${title}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="تصنيف جديد"
          className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15" />
        <button type="submit" className="inline-flex h-10 items-center gap-1 rounded-xl bg-teal-100 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-300/50">
          <Plus className="size-4" /> إضافة
        </button>
      </form>
      <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100">
        {items.length === 0 && <li className="p-3 text-center text-sm text-ink-500">لا توجد تصنيفات</li>}
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-1 px-3 py-1.5 text-sm">
            {editing?.id === c.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => api.put(`/admin/categories/${c.id}`, { name: editing.name.trim() }), 'تم تعديل التصنيف')) setEditing(null);
                }}
              >
                <input autoFocus aria-label="اسم التصنيف" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-brand-400 px-2 text-sm outline-none" />
                <IconButton label="حفظ" type="submit"><Check className="size-4" /></IconButton>
                <IconButton label="إلغاء" onClick={() => setEditing(null)}><X className="size-4" /></IconButton>
              </form>
            ) : (
              <>
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-ink-500">{c.usage ?? 0} عنصر</span>
                <IconButton label={`تعديل ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}><Pencil className="size-4" /></IconButton>
                <IconButton label={`حذف ${c.name}`} tone="danger" onClick={() => setDeleting(c)}><Trash2 className="size-4" /></IconButton>
              </>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="حذف التصنيف"
        message={<>سيُحذف التصنيف «{deleting?.name}»{deleting?.usage ? ` وتصبح ${deleting.usage} عناصر بدون تصنيف` : ''}.</>}
        onConfirm={async () => { if (deleting) await run(() => api.delete(`/admin/categories/${deleting.id}`), 'تم حذف التصنيف'); }}
      />
    </section>
  );
}
