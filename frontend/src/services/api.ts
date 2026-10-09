import type { Reply } from "../types";
export async function api<T = Reply>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      typeof data?.detail === "string" ? data.detail : "连接失败，请稍后重试",
    );
  }
  return response.json();
}
let queue = Promise.resolve();
export function sendCommand(
  action: string,
  data: Record<string, unknown> = {},
): Promise<Reply> {
  const body = { request_id: crypto.randomUUID(), action, data };
  const run = async () => {
    try {
      return await api("command", "POST", body);
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error instanceof DOMException && error.name === "TimeoutError")
      )
        return api("command", "POST", body);
      throw error;
    }
  };
  const result = queue.then(run);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
