import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white hover:bg-brand-700 shadow-sm',
  gradient: 'brand-gradient text-white shadow-[0_8px_20px_-8px_rgb(20_163_157/0.55)] hover:brightness-110',
  secondary: 'bg-teal-100 text-teal-800 hover:bg-teal-300/50',
  outline: 'border border-ink-200 bg-white text-ink-800 hover:border-brand-400 hover:text-brand-800',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-danger-700 text-white hover:bg-danger-700/90',
  light: 'bg-white text-brand-900 hover:bg-brand-50 shadow-sm',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[0.95rem] gap-2 rounded-xl',
  lg: 'h-13 px-6 text-base gap-2.5 rounded-2xl',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-[background-color,color,border-color,filter,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${extra}`;

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & Common>(
  ({ variant, size, icon, loading, className = '', children, disabled, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export function ButtonLink({ variant, size, icon, className = '', children, ...rest }: LinkProps & Common) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export function ExternalButton({
  variant, size, icon, className = '', children, ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & Common) {
  return (
    <a className={buttonClass(variant, size, className)} target="_blank" rel="noopener noreferrer" {...rest}>
      {icon}
      {children}
    </a>
  );
}

export function IconButton({
  label, className = '', children, tone = 'default', ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-xl transition-colors ${
        tone === 'danger' ? 'text-danger-700 hover:bg-danger-50' : 'text-ink-700 hover:bg-ink-100 hover:text-brand-800'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
