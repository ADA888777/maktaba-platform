import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/** حالة البحث والتصفية محفوظة في رابط الصفحة (قابلة للمشاركة والرجوع) */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => {
    const out = { ...defaults };
    (Object.keys(defaults) as (keyof T)[]).forEach((k) => {
      const v = params.get(String(k));
      if (v !== null) out[k] = v as T[keyof T];
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => {
            if (v === undefined || v === '' || v === defaults[k]) next.delete(k);
            else next.set(k, String(v));
          });
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );

  return [state, update] as const;
}
