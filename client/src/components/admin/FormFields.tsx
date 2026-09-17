import { useRef, useState } from 'react';
import { FileUp, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Field, Input, Select, Textarea, Toggle } from '../ui/Field';
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/format';
import { resourceIcons, resourceIconLabels } from '../public/icons';

export type FieldDef =
  | { name: string; label: string; type: 'text' | 'url' | 'date' | 'number'; required?: boolean; hint?: string; span?: 2; min?: number; placeholder?: string }
  | { name: string; label: string; type: 'textarea'; required?: boolean; hint?: string; span?: 2; maxLength?: number }
  | { name: string; label: string; type: 'select'; options: (string | { value: string; label: string })[]; required?: boolean; hint?: string; span?: 2; placeholder?: string | null }
  | { name: string; label: string; type: 'datetime'; required?: boolean; hint?: string; span?: 2 }
  | { name: string; label: string; type: 'toggle'; description?: string; span?: 2 }
  | { name: string; label: string; type: 'upload'; accept: 'image' | 'file'; hint?: string; span?: 2 }
  | { name: string; label: string; type: 'icon'; span?: 2 };

export type Values = Record<string, unknown>;

export function FormFields({
  fields, values, onChange, errors,
}: { fields: FieldDef[]; values: Values; onChange: (name: string, value: unknown) => void; errors: Record<string, string> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const span = f.span === 2 ? 'sm:col-span-2' : '';
        const v = values[f.name];
        const err = errors[f.name];
        switch (f.type) {
          case 'textarea':
            return (
              <Textarea key={f.name} name={f.name} label={f.label} required={f.required} hint={f.hint} error={err} wrapperClass={span}
                maxLength={f.maxLength} value={String(v ?? '')} onChange={(e) => onChange(f.name, e.target.value)} />
            );
          case 'select':
            return (
              <Select key={f.name} name={f.name} label={f.label} required={f.required} hint={f.hint} error={err} wrapperClass={span}
                options={f.options} placeholder={f.placeholder === null ? undefined : (f.placeholder ?? 'بدون')} value={String(v ?? '')} onChange={(e) => onChange(f.name, e.target.value)} />
            );
          case 'toggle':
            return (
              <div key={f.name} className={span}>
                <Toggle label={f.label} description={f.description} checked={Boolean(v)} onChange={(c) => onChange(f.name, c)} />
              </div>
            );
          case 'datetime':
            return (
              <Input key={f.name} name={f.name} type="datetime-local" label={f.label} required={f.required} error={err} wrapperClass={span}
                hint={f.hint ?? 'بتوقيت الرياض'} value={toDateTimeLocal(v as string)} onChange={(e) => onChange(f.name, fromDateTimeLocal(e.target.value))} />
            );
          case 'upload':
            return <UploadField key={f.name} def={f} value={String(v ?? '')} error={err} onChange={(url) => onChange(f.name, url)} className={span} />;
          case 'icon':
            return (
              <Field key={f.name} label={f.label} className={span}>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {Object.entries(resourceIcons).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={v === key}
                      title={resourceIconLabels[key]}
                      aria-label={resourceIconLabels[key]}
                      onClick={() => onChange(f.name, key)}
                      className={`flex size-11 items-center justify-center rounded-xl border transition-colors ${
                        v === key ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-ink-200 text-ink-600 hover:border-ink-300'
                      }`}
                    >
                      <Icon className="size-5" />
                    </button>
                  ))}
                </div>
              </Field>
            );
          default:
            return (
              <Input key={f.name} name={f.name} type={f.type === 'url' ? 'url' : f.type} label={f.label} required={f.required} hint={f.hint}
                error={err} wrapperClass={span} min={f.min} placeholder={f.placeholder ?? (f.type === 'url' ? 'https://' : undefined)}
                dir={f.type === 'url' ? 'ltr' : undefined}
                value={v === null || v === undefined ? '' : String(v)}
                onChange={(e) => onChange(f.name, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
            );
        }
      })}
    </div>
  );
}

function UploadField({
  def, value, onChange, error, className,
}: { def: { name: string; label: string; accept: 'image' | 'file'; hint?: string }; value: string; onChange: (v: string) => void; error?: string; className: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const isImage = def.accept === 'image';

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setUploadError('');
    try {
      const { url } = await api.upload(file);
      onChange(url);
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Field label={def.label} className={className} error={error || uploadError} hint={def.hint ?? (isImage ? 'PNG أو JPG أو WEBP بحد أقصى 5 ميجابايت، أو الصقي رابطًا' : 'PDF أو صورة بحد أقصى 5 ميجابايت، أو الصقي رابطًا')}>
      <div className="flex items-center gap-3">
        {isImage && value && <img src={value} alt="" className="size-14 shrink-0 rounded-xl border border-ink-200 object-cover" />}
        <Input name={def.name} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." dir="ltr" className="min-w-0 flex-1" />
        <input ref={input} type="file" hidden accept={isImage ? 'image/png,image/jpeg,image/webp' : 'application/pdf,image/png,image/jpeg,image/webp'} onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:border-brand-400 disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : isImage ? <ImagePlus className="size-4" /> : <FileUp className="size-4" />}
          رفع
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="rounded-xl p-2.5 text-danger-700 hover:bg-danger-50" aria-label="إزالة">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </Field>
  );
}
