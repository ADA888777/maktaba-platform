import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { SiteSettings } from '../../../lib/types';

type Update = (fn: (d: SiteSettings) => void) => void;
type ListKey = keyof SiteSettings['lists'];

const meta: { key: ListKey; title: string; hint: string }[] = [
  { key: 'specialties', title: 'التخصصات', hint: 'تظهر في نماذج الاستعارة والزيارة وفي التصفية' },
  { key: 'resourceTypes', title: 'أنواع المصادر الإلكترونية', hint: 'لتصنيف المصادر والتصفية' },
  { key: 'projectTypes', title: 'أنواع المشاريع', hint: 'مشروع تخرج، مبادرة، بحث...' },
  { key: 'departments', title: 'الجهات والأقسام', hint: 'الجهة المنظمة للفعاليات' },
];

export function ListsSettings({ draft, update }: { draft: SiteSettings; update: Update }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {meta.map((m) => (
        <ListEditor key={m.key} title={m.title} hint={m.hint} items={draft.lists[m.key]} onChange={(items) => update((d) => { d.lists[m.key] = items; })} />
      ))}
    </div>
  );
}

function ListEditor({ title, hint, items, onChange }: { title: string; hint: string; items: string[]; onChange: (v: string[]) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const add = () => {
    const v = value.trim();
    if (!v) return;
    if (items.includes(v)) return setError('هذا العنصر موجود مسبقًا');
    if (v.length > 80) return setError('الحد الأقصى 80 حرفًا');
    onChange([...items, v]);
    setValue('');
    setError('');
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <section className="card p-5">
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input
          aria-label={`إضافة إلى ${title}`}
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="اكتبي عنصرًا جديدًا"
          className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        />
        <button type="submit" className="inline-flex h-10 items-center gap-1 rounded-xl bg-teal-100 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-300/50">
          <Plus className="size-4" /> إضافة
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-danger-700">{error}</p>}
      <ul className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100">
        {items.length === 0 && <li className="p-3 text-center text-sm text-ink-500">القائمة فارغة</li>}
        {items.map((item, i) => (
          <li key={item} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="flex-1">{item}</span>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label={`نقل ${item} للأعلى`}><ArrowUp className="size-4" /></button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded-lg p-1 text-ink-500 hover:bg-ink-100 disabled:opacity-30" aria-label={`نقل ${item} للأسفل`}><ArrowDown className="size-4" /></button>
            <button type="button" onClick={() => onChange(items.filter((x) => x !== item))} className="rounded-lg p-1 text-danger-700 hover:bg-danger-50" aria-label={`حذف ${item}`}><X className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
