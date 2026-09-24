export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "content-type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Sem conexão. Verifique sua internet.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload intentionally drops all in-memory workspace data
      window.location.assign("/login");
    }
    throw new ApiError(res.status, (data as { error?: string }).error ?? "Algo deu errado");
  }
  return data as T;
}

export const tzOffset = () => new Date().getTimezoneOffset();
