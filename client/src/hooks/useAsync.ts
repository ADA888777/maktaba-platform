import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { errorMessage } from '../lib/api';

export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const counter = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const load = useCallback(async () => {
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === counter.current) setData(result);
    } catch (e) {
      if (id === counter.current) setError(errorMessage(e));
    } finally {
      if (id === counter.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** يعيد وقتًا حاليًا يتحدث دوريًا لإعادة حساب العد التنازلي */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
