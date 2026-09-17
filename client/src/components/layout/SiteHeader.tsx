import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ChevronDown, LayoutGrid, Menu, X } from 'lucide-react';
import { mainNav, services } from '../../lib/services';
import { useConfig } from '../../context/ConfigContext';
import { Logo } from '../ui/Misc';
import { NotificationBell } from './NotificationBell';

export function SiteHeader() {
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!servicesOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !servicesRef.current?.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [servicesOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const name = config?.site.libraryName ?? 'المكتبة الرقمية';

  return (
    <header
      className={`brand-gradient sticky top-0 z-50 text-white transition-shadow ${scrolled ? 'shadow-[0_8px_24px_-12px_rgb(23_75_120/0.6)]' : ''}`}
    >
      <div className="container-page flex h-16 items-center justify-between gap-3 lg:h-[4.5rem]">
        <Link to="/" className="min-w-0 rounded-xl" aria-label={`${name} — الصفحة الرئيسية`}>
          <Logo name={name} logoUrl={config?.site.logoUrl} light />
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="القائمة الرئيسية">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-[0.9rem] font-medium transition-colors ${
                  isActive ? 'bg-white/18 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <div className="relative hidden sm:block" ref={servicesRef}>
            <button
              onClick={() => setServicesOpen((v) => !v)}
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand-900 shadow-sm transition hover:bg-teal-50"
            >
              <LayoutGrid className="size-4" aria-hidden />
              الخدمات
              <ChevronDown className={`size-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 mt-2 w-[22rem] animate-scale-in rounded-2xl border border-ink-200 bg-white p-2 text-ink-800 shadow-[var(--shadow-lift)]">
                {services.map((s) => (
                  <Link key={s.to} to={s.to} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-ink-50">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${s.tone}`}>
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-ink-900">{s.title}</span>
                      <span className="block text-xs leading-5 text-ink-600">{s.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-xl text-white hover:bg-white/10 xl:hidden"
            onClick={() => setOpen(true)}
            aria-label="فتح القائمة"
            aria-expanded={open}
          >
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="القائمة">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] animate-fade-in flex-col bg-white text-ink-800 shadow-2xl">
            <div className="brand-gradient flex h-16 items-center justify-between px-4">
              <Logo name={name} logoUrl={config?.site.logoUrl} light />
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-white hover:bg-white/10" aria-label="إغلاق القائمة">
                <X className="size-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="قائمة الجوال">
              {mainNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[0.95rem] font-semibold ${
                      isActive ? 'bg-teal-50 text-teal-800' : 'text-ink-700 hover:bg-ink-50'
                    }`
                  }
                >
                  <item.icon className="size-5 opacity-80" aria-hidden />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-ink-100 p-4 text-xs leading-6 text-ink-500">
              جميع خدمات المكتبة مجانية، والاستعارة تتم عبر نموذج رسمي دون أي عملية دفع.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
