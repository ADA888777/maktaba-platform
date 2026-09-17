import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** يُخفى في بطاقات الجوال */
  hideOnMobile?: boolean;
  /** العمود الرئيسي يظهر كعنوان في بطاقة الجوال */
  primary?: boolean;
}

/** جدول على الشاشات الكبيرة، وبطاقات مكدسة على الجوال حتى لا تنكسر الصفحة */
export function DataTable<T extends { id: number }>({
  rows, columns, actions, loading,
}: { rows: T[]; columns: Column<T>[]; actions?: (row: T) => ReactNode; loading?: boolean }) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  return (
    <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="card hidden overflow-hidden md:block">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-xs text-ink-600">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${c.className ?? ''}`}>
                    {c.header}
                  </th>
                ))}
                {actions && <th scope="col" className="w-px px-4 py-3 text-left font-semibold">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.render(r)}</td>
                  ))}
                  {actions && <td className="px-3 py-2"><div className="flex justify-end gap-0.5">{actions(r)}</div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 font-bold text-ink-900">{primary.render(r)}</div>
              {actions && <div className="-m-1 flex shrink-0">{actions(r)}</div>}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
              {columns
                .filter((c) => c !== primary && !c.hideOnMobile)
                .map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-ink-500">{c.header}</dt>
                    <dd className="mt-0.5 min-w-0 break-words text-ink-800">{c.render(r)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
