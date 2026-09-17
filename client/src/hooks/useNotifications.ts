import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { LibraryEvent } from '../lib/types';

let cache: { at: number; items: LibraryEvent[] } | null = null;
let inflight: Promise<LibraryEvent[]> | null = null;

function load() {
  if (cache && Date.now() - cache.at < 60000) return Promise.resolve(cache.items);
  inflight ??= api
    .get<LibraryEvent[]>('/public/notifications')
    .then((items) => {
      cache = { at: Date.now(), items };
      return items;
    })
    .catch(() => [])
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** الفعاليات القريبة لشريط التنبيه وجرس التنبيهات (مشتركة ومخزنة مؤقتًا لدقيقة) */
export function useUpcomingNotifications() {
  const [items, setItems] = useState<LibraryEvent[]>(cache?.items ?? []);
  useEffect(() => {
    let alive = true;
    const refresh = () => load().then((r) => alive && setItems(r));
    void refresh();
    const t = setInterval(refresh, 5 * 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return { items };
}
