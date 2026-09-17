import { useEffect, useState } from 'react';
import {
  Building2, Database, FileSpreadsheet, KeyRound, ListChecks, Save, Tags, UserCog,
} from 'lucide-react';
import { api, ApiError, errorMessage } from '../../lib/api';
import type { RelayAvailability, SiteSettings } from '../../lib/types';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';
import { useUrlState } from '../../hooks/useUrlState';
import { Tabs } from '../../components/ui/Misc';
import { Button } from '../../components/ui/Button';
import { Alert, ErrorState, Spinner } from '../../components/ui/Feedback';
import { Input, Toggle } from '../../components/ui/Field';
import { FormFields } from '../../components/admin/FormFields';
import { FormsSettings } from './settings/FormsSettings';
import { ListsSettings } from './settings/ListsSettings';
import { CategoriesSettings } from './settings/CategoriesSettings';
import { UsersSettings } from './settings/UsersSettings';
import { DataSettings } from './settings/DataSettings';
import { AccountSettings } from './settings/AccountSettings';

type Tab = 'general' | 'forms' | 'lists' | 'categories' | 'users' | 'data' | 'account';
type SettingsResponse = { settings: SiteSettings; relay: { borrow: RelayAvailability; visit: RelayAvailability }; environment: { production: boolean } };

export default function SettingsPage() {
  const { can } = useAuth();
  const allTabs = [
    { value: 'general' as Tab, label: 'عام', icon: Building2, show: can('settings') },
    { value: 'forms' as Tab, label: 'Microsoft Forms', icon: FileSpreadsheet, show: can('settings') },
    { value: 'lists' as Tab, label: 'القوائم', icon: ListChecks, show: can('settings') },
    { value: 'categories' as Tab, label: 'التصنيفات', icon: Tags, show: can('content') },
    { value: 'users' as Tab, label: 'المستخدمون', icon: UserCog, show: can('users') },
    { value: 'data' as Tab, label: 'البيانات', icon: Database, show: can('settings') },
    { value: 'account' as Tab, label: 'حسابي', icon: KeyRound, show: true },
  ].filter((t) => t.show);
  const [q, setQ] = useUrlState({ tab: allTabs[0].value as string });
  const tab = (allTabs.some((t) => t.value === q.tab) ? q.tab : allTabs[0].value) as Tab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-ink-600">إعدادات المنصة وربط النماذج والصلاحيات.</p>
      </div>
      <Tabs value={tab} onChange={(t) => setQ({ tab: t })} items={allTabs} />
      {['general', 'forms', 'lists'].includes(tab) ? (
        <SiteSettingsEditor tab={tab as 'general' | 'forms' | 'lists'} />
      ) : tab === 'categories' ? (
        <CategoriesSettings />
      ) : tab === 'users' ? (
        <UsersSettings />
      ) : tab === 'data' ? (
        <DataSettings />
      ) : (
        <AccountSettings />
      )}
    </div>
  );
}

function SiteSettingsEditor({ tab }: { tab: 'general' | 'forms' | 'lists' }) {
  const toast = useToast();
  const { reload: reloadPublic } = useConfig();
  const res = useAsync(() => api.get<SettingsResponse>('/admin/settings'), []);
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (res.data) setDraft(structuredClone(res.data.settings));
  }, [res.data]);

  if (res.error) return <ErrorState message={res.error} onRetry={res.reload} />;
  if (!draft || !res.data) return <Spinner />;

  const dirty = JSON.stringify(draft) !== JSON.stringify(res.data.settings);
  const update = (patch: (d: SiteSettings) => void) =>
    setDraft((d) => {
      if (!d) return d;
      const copy = structuredClone(d);
      patch(copy);
      return copy;
    });

  const save = async () => {
    setSaving(true);
    setError('');
    setErrors({});
    try {
      const out = await api.put<{ settings: SiteSettings }>('/admin/settings', draft);
      res.setData({ ...res.data!, settings: out.settings });
      setDraft(structuredClone(out.settings));
      await reloadPublic();
      toast('تم حفظ الإعدادات');
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const site = draft.site;
  const siteErr = (k: string) => errors[`site.${k}`];

  return (
    <div className="space-y-5 pb-20">
      {error && (
        <Alert tone="error" title={error}>
          {Object.values(errors).length > 0 && <ul className="list-disc ps-5">{Object.entries(errors).map(([k, v]) => <li key={k}>{v}</li>)}</ul>}
        </Alert>
      )}

      {tab === 'general' && (
        <>
          <section className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-bold">بيانات المكتبة</h2>
            <FormFields
              errors={Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith('site.')).map(([k, v]) => [k.slice(5), v]))}
              values={site}
              onChange={(name, value) => update((d) => { (d.site as Record<string, unknown>)[name] = value; })}
              fields={[
                { name: 'libraryName', label: 'اسم المكتبة', type: 'text', required: true },
                { name: 'institutionName', label: 'اسم المؤسسة التعليمية', type: 'text', hint: 'يظهر في الصفحة الرئيسية والتذييل' },
                { name: 'logoUrl', label: 'الشعار الرسمي', type: 'upload', accept: 'image', span: 2, hint: 'يظهر شعار مؤقت إلى أن يُرفع الشعار الرسمي' },
                { name: 'location', label: 'موقع المكتبة', type: 'text' },
                { name: 'workingHours', label: 'ساعات العمل', type: 'text', placeholder: 'مثال: الأحد – الخميس، 8 صباحًا – 2 ظهرًا' },
                { name: 'contactEmail', label: 'بريد التواصل', type: 'text' },
                { name: 'formsOwnerAccount', label: 'حساب المؤسسة المالك للنماذج', type: 'text', hint: 'للتوثيق فقط — لا يُستخدم لتسجيل الدخول ولا تُحفظ كلمة مروره' },
              ]}
            />
            {siteErr('contactEmail') && <p className="text-xs text-danger-700">{siteErr('contactEmail')}</p>}
          </section>
          <section className="card space-y-3 p-5 sm:p-6">
            <h2 className="text-lg font-bold">تنبيهات الفعاليات</h2>
            <Toggle
              label="إظهار تنبيهات الفعاليات القادمة للزائرات"
              description="شريط أعلى الموقع + جرس التنبيهات، مع حساب المدة المتبقية تلقائيًا"
              checked={draft.notifications.enabled}
              onChange={(v) => update((d) => { d.notifications.enabled = v; })}
            />
            <Input
              label="إظهار الفعاليات التي تبدأ خلال (يومًا)"
              type="number"
              min={1}
              max={60}
              required
              value={draft.notifications.daysAhead}
              onChange={(e) => update((d) => { d.notifications.daysAhead = Number(e.target.value) || 1; })}
              wrapperClass="max-w-xs"
            />
          </section>
        </>
      )}

      {tab === 'forms' && <FormsSettings draft={draft} update={update} relay={res.data.relay} production={res.data.environment.production} errors={errors} />}
      {tab === 'lists' && <ListsSettings draft={draft} update={update} />}

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 backdrop-blur transition-transform lg:right-[17rem] ${dirty ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="text-sm font-semibold text-ink-700">لديك تغييرات غير محفوظة</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(structuredClone(res.data!.settings))}>تراجع</Button>
            <Button variant="primary" loading={saving} onClick={() => void save()} icon={<Save className="size-4" />}>حفظ الإعدادات</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
