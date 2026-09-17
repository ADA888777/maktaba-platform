import { createContext, useContext, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { PublicConfig } from '../lib/types';
import { useAsync } from '../hooks/useAsync';

interface ConfigState {
  config: PublicConfig | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const Ctx = createContext<ConfigState | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useAsync(() => api.get<PublicConfig>('/public/config'), []);
  return <Ctx.Provider value={{ config: data, loading, error, reload }}>{children}</Ctx.Provider>;
}

export function useConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ConfigProvider مفقود');
  return ctx;
}
