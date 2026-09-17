import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Inbox, Loader2, RotateCw, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

export function Spinner({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-500" role="status">
      <Loader2 className="size-5 animate-spin text-teal-600" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox, title, description, action,
}: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <Icon className="size-7" aria-hidden />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm leading-7 text-ink-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-danger-700/20 bg-danger-50 px-6 py-10 text-center" role="alert">
      <AlertTriangle className="mb-3 size-8 text-danger-700" aria-hidden />
      <p className="font-semibold text-danger-700">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" icon={<RotateCw className="size-4" />} onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

const alertTones = {
  info: { cls: 'border-brand-300/60 bg-brand-50 text-brand-900', Icon: Info },
  success: { cls: 'border-leaf-300 bg-leaf-50 text-leaf-700', Icon: CheckCircle2 },
  warning: { cls: 'border-warn-700/25 bg-warn-50 text-warn-700', Icon: AlertTriangle },
  error: { cls: 'border-danger-700/25 bg-danger-50 text-danger-700', Icon: AlertTriangle },
};

export function Alert({
  tone = 'info', title, children, className = '',
}: { tone?: keyof typeof alertTones; title?: string; children?: ReactNode; className?: string }) {
  const { cls, Icon } = alertTones[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 ${cls} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-7">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          {tall && <div className="skeleton h-40 w-full" />}
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
