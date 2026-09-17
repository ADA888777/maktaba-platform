import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const Ctx = createContext<((message: string, tone?: Tone) => void) | null>(null);

const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };
const tones = {
  success: 'border-leaf-300 bg-leaf-50 text-leaf-700',
  error: 'border-danger-700/30 bg-danger-50 text-danger-700',
  info: 'border-brand-300 bg-brand-50 text-brand-800',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-md animate-scale-in items-start gap-3 rounded-2xl border px-4 py-3 shadow-[var(--shadow-lift)] ${tones[t.tone]}`}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-sm leading-6 font-medium">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="rounded-md p-1 opacity-70 hover:opacity-100" aria-label="إغلاق">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ToastProvider مفقود');
  return ctx;
}
