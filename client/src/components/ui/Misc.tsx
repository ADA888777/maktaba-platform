import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { fmtNumber } from '../../lib/format';

type BadgeTone = 'teal' | 'blue' | 'green' | 'gray' | 'red' | 'amber' | 'white';
const badgeTones: Record<BadgeTone, string> = {
  teal: 'bg-teal-50 text-teal-800 ring-teal-300/60',
  blue: 'bg-brand-50 text-brand-800 ring-brand-300/60',
  green: 'bg-leaf-50 text-leaf-700 ring-leaf-300',
  gray: 'bg-ink-100 text-ink-700 ring-ink-200',
  red: 'bg-danger-50 text-danger-700 ring-danger-700/20',
  amber: 'bg-warn-50 text-warn-700 ring-warn-700/20',
  white: 'bg-white/15 text-white ring-white/25 backdrop-blur',
};

export function Badge({ tone = 'gray', children, icon: Icon, dot }: { tone?: BadgeTone; children: ReactNode; icon?: LucideIcon; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${badgeTones[tone]}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

export function PageHero({
  eyebrow, title, description, icon: Icon, children,
}: { eyebrow?: string; title: string; description?: string; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <section className="brand-gradient hero-pattern relative overflow-hidden text-white">
      <div className="container-page relative py-10 sm:py-14">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20 sm:flex">
              <Icon className="size-7" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-sm font-medium text-teal-300">{eyebrow}</p>}
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-4xl">{title}</h1>
            {description && <p className="mt-3 max-w-2xl text-[0.95rem] leading-8 text-white/85 sm:text-base">{description}</p>}
          </div>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

export function SectionTitle({ title, description, action, id }: { title: string; description?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-xl font-bold sm:text-2xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-7 text-ink-600 sm:text-[0.95rem]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="التنقل بين الصفحات">
      <button
        className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink-700 hover:bg-white disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronRight className="size-4" /> السابق
      </button>
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-400">…</span>}
          <button
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`size-10 rounded-xl text-sm font-semibold ${n === page ? 'bg-brand-800 text-white' : 'text-ink-700 hover:bg-white'}`}
          >
            {fmtNumber(n)}
          </button>
        </span>
      ))}
      <button
        className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink-700 hover:bg-white disabled:opacity-40"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        التالي <ChevronLeft className="size-4" />
      </button>
    </nav>
  );
}

export function Tabs<T extends string>({
  value, onChange, items, className = '',
}: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number; icon?: LucideIcon }[]; className?: string }) {
  return (
    <div role="tablist" className={`scrollbar-thin flex gap-1 overflow-x-auto rounded-2xl bg-ink-100 p-1 ${className}`}>
      {items.map(({ value: v, label, count, icon: Icon }) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors ${
            value === v ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          {Icon && <Icon className="size-4" aria-hidden />}
          {label}
          {count !== undefined && (
            <span className={`rounded-full px-2 text-xs ${value === v ? 'bg-teal-50 text-teal-800' : 'bg-ink-200 text-ink-700'}`}>{fmtNumber(count)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Chips({
  value, onChange, options, allLabel = 'الكل', label,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel?: string; label: string }) {
  const all = [{ value: '', label: allLabel }, ...options];
  return (
    <div role="radiogroup" aria-label={label} className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {all.map((o) => (
        <button
          key={o.value || 'all'}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
            value === o.value ? 'border-brand-800 bg-brand-800 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({
  label, value, icon: Icon, tone = 'blue', hint, loading,
}: { label: string; value: number | string; icon: LucideIcon; tone?: 'blue' | 'teal' | 'green' | 'petrol' | 'gray'; hint?: string; loading?: boolean }) {
  const tones = {
    blue: 'bg-brand-50 text-brand-700',
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-leaf-50 text-leaf-700',
    petrol: 'bg-[#E6F1F4] text-petrol-700',
    gray: 'bg-ink-100 text-ink-700',
  };
  return (
    <div className="card flex items-start gap-3.5 p-4 sm:p-5">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-600 sm:text-sm">{label}</p>
        {loading ? (
          <div className="skeleton mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900 tabular-nums">{typeof value === 'number' ? fmtNumber(value) : value}</p>
        )}
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
    </div>
  );
}

export function Logo({ name, logoUrl, light = false, compact = false }: { name: string; logoUrl?: string; light?: boolean; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-xl bg-white object-contain p-1" />
      ) : (
        // مكان مؤقت للشعار إلى أن يتم تزويد الشعار الرسمي من الإعدادات
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${light ? 'bg-white/15 ring-1 ring-white/30' : 'brand-gradient'}`}
          title="مكان الشعار الرسمي"
        >
          <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M6 8h7a3 3 0 0 1 3 3v14a2.5 2.5 0 0 0-2.5-2.5H6z" />
            <path d="M26 8h-7a3 3 0 0 0-3 3v14a2.5 2.5 0 0 1 2.5-2.5H26z" />
          </svg>
        </span>
      )}
      {!compact && (
        <span className={`truncate text-base font-bold sm:text-lg ${light ? 'text-white' : 'text-ink-900'}`}>{name}</span>
      )}
    </span>
  );
}
