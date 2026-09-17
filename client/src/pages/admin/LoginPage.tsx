import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowRight, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { errorMessage, api } from '../../lib/api';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { Input } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { Logo } from '../../components/ui/Misc';

export default function LoginPage() {
  const { user, login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setup = useAsync(() => api.get<{ hasUsers: boolean }>('/auth/setup-status'), []);
  useDocumentTitle('تسجيل دخول الإدارة');

  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith('/admin') && from !== '/admin/login' ? from : '/admin';
  if (user) return <Navigate to={target} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('أدخلي اسم المستخدم وكلمة المرور');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="brand-gradient hero-pattern flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="mb-6 flex justify-center">
          <Logo name={config?.site.libraryName ?? 'المكتبة الرقمية'} logoUrl={config?.site.logoUrl} light />
        </div>
        <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8" noValidate>
          <div className="mb-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <Lock className="size-6" aria-hidden />
            </div>
            <h1 className="mt-3 text-xl font-bold">دخول لوحة التحكم</h1>
            <p className="mt-1 text-sm text-ink-600">مخصص لمسؤولات المكتبة فقط</p>
          </div>
          {setup.data && !setup.data.hasUsers && (
            <Alert tone="warning" title="لم يُنشأ أي حساب بعد" className="mb-4">
              اضبطي متغيرات ADMIN_USERNAME و ADMIN_PASSWORD_HASH في ملف البيئة ثم أعيدي تشغيل الخادم (راجعي ملف README).
            </Alert>
          )}
          {error && <Alert tone="error" className="mb-4">{error}</Alert>}
          <div className="space-y-4">
            <Input label="اسم المستخدم" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="ltr" dir="ltr" />
            <Input label="كلمة المرور" required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <Button type="submit" variant="gradient" size="lg" className="mt-6 w-full" loading={busy} icon={<LogIn className="size-5" />}>
            تسجيل الدخول
          </Button>
        </form>
        <Link to="/" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-white/85 hover:text-white">
          <ArrowRight className="size-4" /> العودة إلى الموقع
        </Link>
      </div>
    </div>
  );
}
