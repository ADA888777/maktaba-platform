import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router';
import {
  BarChart3, BookMarked, BookOpen, CalendarClock, ClipboardList, ExternalLink, FolderKanban, Globe2,
  LayoutDashboard, LogOut, Menu, Settings, Users, X, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import type { Permission } from '../../lib/types';
import { Logo } from '../ui/Misc';
import { Spinner } from '../ui/Feedback';

const nav: { to: string; label: string; icon: LucideIcon; perm: Permission; end?: boolean }[] = [
  { to: '/admin', label: 'الرئيسية', icon: LayoutDashboard, perm: 'stats', end: true },
  { to: '/admin/stats', label: 'الإحصائيات', icon: BarChart3, perm: 'stats' },
  { to: '/admin/books', label: 'الكتب', icon: BookOpen, perm: 'content' },
  { to: '/admin/resources', label: 'المصادر الإلكترونية', icon: Globe2, perm: 'content' },
  { to: '/admin/loans', label: 'الاستعارات', icon: BookMarked, perm: 'loans' },
  { to: '/admin/projects', label: 'المشاريع', icon: FolderKanban, perm: 'content' },
  { to: '/admin/events', label: 'الفعاليات القادمة', icon: CalendarClock, perm: 'content' },
  { to: '/admin/surveys', label: 'الاستبيانات', icon: ClipboardList, perm: 'content' },
  { to: '/admin/visitors', label: 'الزوار', icon: Users, perm: 'stats' },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings, perm: 'content' },
];

export function RequireAuth() {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Spinner label="جارٍ التحقق من الجلسة..." />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <AdminLayout />;
}

function AdminLayout() {
  const { user, logout, can } = useAuth();
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.title = `لوحة التحكم — ${config?.site.libraryName ?? 'المكتبة'}`;
  }, [config?.site.libraryName, pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="brand-gradient flex h-16 shrink-0 items-center justify-between px-4">
        <Link to="/admin"><Logo name={config?.site.libraryName ?? 'المكتبة'} logoUrl={config?.site.logoUrl} light /></Link>
        <button className="rounded-lg p-1.5 text-white hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">
          <X className="size-5" />
        </button>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="قائمة لوحة التحكم">
        {nav.filter((n) => can(n.perm)).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-brand-800 text-white shadow-sm' : 'text-ink-700 hover:bg-ink-100 hover:text-ink-900'
              }`
            }
          >
            <n.icon className="size-[1.15rem] shrink-0" aria-hidden />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <Link to="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-100">
          <ExternalLink className="size-[1.15rem]" aria-hidden /> عرض الموقع
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-ink-50 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
            {user?.displayName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-900">{user?.displayName}</p>
            <p className="text-xs text-ink-500">{user?.role === 'admin' ? 'مسؤولة النظام' : 'أمينة مكتبة'}</p>
          </div>
          <button onClick={() => void logout()} className="rounded-lg p-2 text-ink-600 hover:bg-white hover:text-danger-700" aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const current = nav.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

  return (
    <div className="min-h-dvh bg-ink-50 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-l border-ink-200 bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fade-in bg-ink-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[min(18rem,86vw)] animate-fade-in bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-xl p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => setOpen(true)} aria-label="فتح القائمة">
            <Menu className="size-6" />
          </button>
          <p className="text-base font-bold text-ink-900">{current?.label ?? 'لوحة التحكم'}</p>
        </header>
        <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function RequirePermission({ perm, children }: { perm: Permission; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(perm)) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-bold">ليست لديك صلاحية للوصول إلى هذه الصفحة</p>
        <p className="mt-2 text-sm text-ink-600">تواصلي مع مسؤولة النظام إذا كنتِ بحاجة إلى هذه الصلاحية.</p>
      </div>
    );
  }
  return <>{children}</>;
}
