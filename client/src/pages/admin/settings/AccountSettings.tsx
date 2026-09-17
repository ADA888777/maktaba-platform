import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Input } from '../../../components/ui/Field';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Feedback';

export function AccountSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 10 || !/\d/.test(next) || !/[^\d\s]/.test(next)) return setError('كلمة المرور الجديدة: 10 أحرف على الأقل وتحتوي على حروف وأرقام');
    if (next !== confirm) return setError('تأكيد كلمة المرور غير مطابق');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      toast('تم تغيير كلمة المرور');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-xl space-y-4 p-5 sm:p-6" noValidate>
      <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound className="size-5 text-teal-700" /> تغيير كلمة المرور</h2>
      <p className="text-sm text-ink-600">الحساب: <span dir="ltr" className="font-semibold">{user?.username}</span></p>
      {error && <Alert tone="error">{error}</Alert>}
      <Input label="كلمة المرور الحالية" required type="password" dir="ltr" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input label="كلمة المرور الجديدة" required type="password" dir="ltr" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="10 أحرف على الأقل تتضمن حروفًا وأرقامًا" />
      <Input label="تأكيد كلمة المرور الجديدة" required type="password" dir="ltr" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button type="submit" loading={busy}>حفظ كلمة المرور</Button>
    </form>
  );
}
