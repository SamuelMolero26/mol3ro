import "server-only";

export const SUCCESS_CACHE_CONTROL =
  "public, s-maxage=3600, stale-while-revalidate=86400";
export const NO_STORE_CACHE_CONTROL = "no-store";

interface UpstreamDeadline {
  signal: AbortSignal;
  dispose: () => void;
}

interface UpstreamTextOptions {
  signal: AbortSignal;
  maxBytes: number;
  headers?: HeadersInit;
}

export interface UpstreamText {
  text: string;
  byteLength: number;
}

export function createUpstreamDeadline(timeoutMs: number): UpstreamDeadline {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => globalThis.clearTimeout(timeout),
  };
}

export async function fetchUpstreamText(
  input: string | URL,
  { signal, maxBytes, headers }: UpstreamTextOptions,
): Promise<UpstreamText> {
  const response = await fetch(input, {
    cache: "no-store",
    headers,
    redirect: "error",
    signal,
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      await response.body?.cancel();
      throw new Error("Upstream response exceeded the body limit");
    }
  }

  if (!response.body) {
    return { text: "", byteLength: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new Error("Upstream response exceeded the body limit");
      }
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { text: new TextDecoder().decode(body), byteLength };
}

export async function fetchUpstreamJson(
  input: string | URL,
  options: UpstreamTextOptions,
): Promise<unknown> {
  const { text } = await fetchUpstreamText(input, options);
  return JSON.parse(text) as unknown;
}
