/** Calls a workspace API route and returns its `data`, or throws the server's error message. */
export async function workspaceApi<T>(url: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Something went wrong. Try again.");
  return json.data as T;
}

export const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
