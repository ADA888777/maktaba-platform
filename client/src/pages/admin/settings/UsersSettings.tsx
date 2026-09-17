import { useState } from 'react';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { api, ApiError, errorMessage } from '../../../lib/api';
import type { AdminUser, UserRole } from '../../../lib/types';
import { useAsync } from '../../../hooks/useAsync';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { DataTable } from '../../../components/admin/DataTable';
import { Alert, EmptyState, ErrorState, Spinner } from '../../../components/ui/Feedback';
import { Badge } from '../../../components/ui/Misc';
import { Button, IconButton } from '../../../components/ui/Button';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Input, Select, Toggle } from '../../../components/ui/Field';
import { fmtDate } from '../../../lib/format';

const roleLabel: Record<UserRole, string> = { admin: 'مسؤولة النظام', librarian: 'أمينة مكتبة' };

interface Draft {
  id?: number;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  password: string;
}

export function UsersSettings() {
  const { user: me } = useAuth();
  const toast = useToast();
  const list = useAsync(() => api.get<AdminUser[]>('/admin/users'), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const save = async () => {
    if (!draft) return;
    const errs: Record<string, string> = {};
    if (!draft.id && !/^[A-Za-z0-9._-]{3,40}$/.test(draft.username)) errs.username = 'من 3 إلى 40 حرفًا إنجليزيًا أو أرقامًا';
    if (!draft.displayName.trim()) errs.displayName = 'الاسم الظاهر مطلوب';
    if ((!draft.id || draft.password) && (draft.password.length < 10 || !/\d/.test(draft.password))) errs.password = '10 أحرف على الأقل وتحتوي على أرقام وحروف';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError('');
    try {
      if (draft.id) {
        await api.put(`/admin/users/${draft.id}`, {
          displayName: draft.displayName,
          role: draft.role,
          isActive: draft.isActive,
          ...(draft.password ? { password: draft.password } : {}),
        });
      } else {
        await api.post('/admin/users', { username: draft.username, displayName: draft.displayName, role: draft.role, password: draft.password });
      }
      toast(draft.id ? 'تم تحديث المستخدم' : 'تم إنشاء المستخدم');
      setDraft(null);
      void list.reload();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Alert tone="info" className="flex-1">
          <strong>مسؤولة النظام:</strong> كل الصلاحيات. <strong>أمينة مكتبة:</strong> إدارة المحتوى والاستعارات والإحصائيات دون الإعدادات والمستخدمين.
        </Alert>
        <Button variant="gradient" icon={<Plus className="size-4" />} onClick={() => { setErrors({}); setError(''); setDraft({ username: '', displayName: '', role: 'librarian', isActive: true, password: '' }); }}>
          مستخدم جديد
        </Button>
      </div>
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <Spinner />
      ) : !list.data.length ? (
        <EmptyState icon={UserCog} title="لا يوجد مستخدمون" />
      ) : (
        <DataTable<AdminUser>
          rows={list.data}
          columns={[
            { key: 'name', header: 'الاسم', primary: true, render: (u) => <div><p className="font-bold">{u.displayName}{u.id === me?.id && <span className="ms-2 text-xs text-teal-700">(أنتِ)</span>}</p><p dir="ltr" className="text-right text-xs text-ink-500">{u.username}</p></div> },
            { key: 'role', header: 'الصلاحية', render: (u) => <Badge tone={u.role === 'admin' ? 'blue' : 'teal'}>{roleLabel[u.role]}</Badge> },
            { key: 'status', header: 'الحالة', render: (u) => <Badge tone={u.isActive ? 'green' : 'gray'} dot>{u.isActive ? 'مفعّل' : 'موقوف'}</Badge> },
            { key: 'last', header: 'آخر دخول', render: (u) => (u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'لم يسجل الدخول') },
          ]}
          actions={(u) => (
            <>
              <IconButton label={`تعديل ${u.displayName}`} onClick={() => { setErrors({}); setError(''); setDraft({ ...u, password: '' }); }}><Pencil className="size-4" /></IconButton>
              {u.id !== me?.id && <IconButton label={`حذف ${u.displayName}`} tone="danger" onClick={() => setDeleting(u)}><Trash2 className="size-4" /></IconButton>}
            </>
          )}
        />
      )}

      <Modal
        open={Boolean(draft)}
        onClose={() => !saving && setDraft(null)}
        title={draft?.id ? 'تعديل مستخدم' : 'مستخدم جديد'}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>إلغاء</Button><Button loading={saving} onClick={() => void save()}>حفظ</Button></>}
      >
        {draft && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            {error && <Alert tone="error">{error}</Alert>}
            <Input label="اسم المستخدم" required disabled={Boolean(draft.id)} dir="ltr" autoComplete="off" value={draft.username} error={errors.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
            <Input label="الاسم الظاهر" required value={draft.displayName} error={errors.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
            <Select label="الصلاحية" required value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as UserRole })}
              options={[{ value: 'librarian', label: roleLabel.librarian }, { value: 'admin', label: roleLabel.admin }]} />
            <Input label={draft.id ? 'كلمة مرور جديدة' : 'كلمة المرور'} required={!draft.id} type="password" dir="ltr" autoComplete="new-password"
              value={draft.password} error={errors.password} hint={draft.id ? 'اتركيها فارغة للإبقاء على الحالية' : '10 أحرف على الأقل تتضمن حروفًا وأرقامًا'}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            {draft.id && draft.id !== me?.id && (
              <Toggle label="الحساب مفعّل" checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} />
            )}
            <button type="submit" hidden />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="حذف المستخدم"
        message={<>سيُحذف حساب «{deleting?.displayName}» نهائيًا.</>}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await api.delete(`/admin/users/${deleting.id}`);
            toast('تم حذف المستخدم');
            void list.reload();
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        }}
      />
    </div>
  );
}
