import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
      (first ?? panel.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" dir="rtl">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full animate-scale-in flex-col rounded-t-3xl bg-white shadow-[var(--shadow-lift)] outline-none sm:rounded-3xl ${widths[size]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-ink-600">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="-m-1 rounded-xl p-2 text-ink-500 hover:bg-ink-100" aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'تأكيد الحذف', tone = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } catch {
                /* يبقى الحوار مفتوحًا عند فشل التأكيد */
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-700">
            <AlertTriangle className="size-5" />
          </div>
        )}
        <div className="text-sm leading-7 text-ink-700">{message}</div>
      </div>
    </Modal>
  );
}
