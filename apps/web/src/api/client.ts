export type ApiErrorPayload = {
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.error.message);
    this.code = payload.error.code;
    this.requestId = payload.requestId;
    this.details = payload.error.details;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await parseJson<ApiErrorPayload>(response);
    throw new ApiError(payload);
  }

  if (response.status === 204) return {} as T;
  return parseJson<T>(response);
}

