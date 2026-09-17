export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`/api${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  return url.pathname + url.search;
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'X-Library-Client': '1',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'تعذر الاتصال بالخادم. تحققي من اتصال الإنترنت ثم حاولي مجددًا.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fields = (data.fields ?? data.details?.fields ?? {}) as Record<string, string>;
    throw new ApiError(res.status, data.error ?? 'حدث خطأ غير متوقع', fields);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<{ url: string }>('POST', '/admin/uploads', fd);
  },
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
