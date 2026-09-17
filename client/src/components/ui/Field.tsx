import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const base =
  'w-full rounded-xl border bg-white px-3.5 text-[0.95rem] text-ink-900 placeholder:text-ink-400 transition-[border-color,box-shadow] outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 disabled:bg-ink-50 disabled:text-ink-500';
const stateCls = (error?: string) => (error ? 'border-danger-700/60' : 'border-ink-200');

export function Field({
  label, required, error, hint, children, className = '', htmlFor,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink-800">
        {label}
        {required ? <span className="ms-1 text-danger-700" aria-hidden>*</span> : <span className="ms-1.5 text-xs font-normal text-ink-500">(اختياري)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger-700" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: ReactNode; wrapperClass?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, wrapperClass, className = '', id, required, ...rest }, ref) => {
  const auto = useId();
  const input = (
    <input
      ref={ref}
      id={id ?? auto}
      required={required}
      aria-invalid={Boolean(error)}
      className={`${base} h-11 ${stateCls(error)} ${className}`}
      {...rest}
    />
  );
  if (!label) return input;
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id ?? auto} className={wrapperClass}>
      {input}
    </Field>
  );
});
Input.displayName = 'Input';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: ReactNode; wrapperClass?: string };
export function Textarea({ label, error, hint, wrapperClass, className = '', id, required, ...rest }: TextareaProps) {
  const auto = useId();
  const el = (
    <textarea
      id={id ?? auto}
      required={required}
      aria-invalid={Boolean(error)}
      className={`${base} min-h-24 py-2.5 leading-7 ${stateCls(error)} ${className}`}
      {...rest}
    />
  );
  if (!label) return el;
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id ?? auto} className={wrapperClass}>
      {el}
    </Field>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
  wrapperClass?: string;
  options: (string | { value: string | number; label: string })[];
  placeholder?: string;
};
export function Select({ label, error, hint, wrapperClass, className = '', id, required, options, placeholder, ...rest }: SelectProps) {
  const auto = useId();
  const el = (
    <div className="relative">
      <select
        id={id ?? auto}
        required={required}
        aria-invalid={Boolean(error)}
        className={`${base} h-11 appearance-none pe-10 ${stateCls(error)} ${className}`}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          ),
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
    </div>
  );
  if (!label) return el;
  return (
    <Field label={label} required={required} error={error} hint={hint} htmlFor={id ?? auto} className={wrapperClass}>
      {el}
    </Field>
  );
}

export function Toggle({
  checked, onChange, label, description,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ink-200 bg-white p-3.5">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-semibold text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-ink-500">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-ink-300'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-200 ${
            checked ? 'start-[1.375rem]' : 'start-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function SearchInput({
  value, onChange, placeholder = 'ابحثي...', className = '', label = 'بحث',
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; label?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${base} h-12 border-ink-200 ps-11 pe-10 [&::-webkit-search-cancel-button]:hidden`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 left-2.5 -translate-y-1/2 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
          aria-label="مسح البحث"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function CheckboxCard({
  checked, onChange, label, type = 'checkbox', name,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; type?: 'checkbox' | 'radio'; name?: string }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${
        checked ? 'border-teal-500 bg-teal-50 text-teal-800 font-semibold' : 'border-ink-200 bg-white text-ink-800 hover:border-ink-300'
      }`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 accent-teal-700"
      />
      <span className="leading-6">{label}</span>
    </label>
  );
}
