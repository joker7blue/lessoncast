// Minimal client for the Meta Model API (OpenAI-compatible): https://dev.meta.ai/docs/overview

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Meta Model API HTTP ${status}: ${body.slice(0, 600)}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function apiBase(): string {
  return process.env.META_API_BASE_URL || "https://api.meta.ai/v1";
}

function apiKey(): string {
  const key = process.env.MODEL_API_KEY;
  if (!key) throw new Error("MODEL_API_KEY is not set");
  return key;
}

type PostOptions = {
  /** Abort after this long, reading the body included: fetch alone waits 300 s, a task's whole budget. */
  timeoutMs: number;
  accept?: string;
};

/** POSTs a JSON body to the API. Throws ApiError on a non-2xx status, a TimeoutError past timeoutMs. */
export async function postJson(pathname: string, body: unknown, { timeoutMs, accept = "application/json" }: PostOptions): Promise<Response> {
  const res = await fetch(`${apiBase()}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", Accept: accept },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res;
}
