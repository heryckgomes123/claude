/**
 * Cliente HTTP para o backend da LIFT (quando existir).
 * O token de sessão virá do AuthService — nunca de variáveis VITE_*.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body?.error ?? 'http_error', body?.message ?? `HTTP ${res.status}`)
  return body as T
}
