// See `math_toolcall.md` at the repo root for the spec these shapes implement.

export type ResponseEvent = {
  kind: "response";
  ts: number;
  platform?: string;
};

export type ToolCallEvent = {
  kind: "tool_call";
  ts: number;
  name: string;
  durationMs: number;
  ok: boolean;
};

export type UsageEvent = ResponseEvent | ToolCallEvent;

export interface MeterSnapshot {
  responses: number;
  toolCalls: number;
  pending: number;
}

export interface Meter {
  recordResponse(event?: { platform?: string }): void;
  recordToolCall(event: { name: string; durationMs?: number; ok?: boolean }): void;
  tool<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  snapshot(): MeterSnapshot;
  flush(): Promise<void>;
  stop(): Promise<void>;
}

export interface MeterOptions {
  projectId?: string;
  projectSecret?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
  flushIntervalMs?: number;
  flushBatchSize?: number;
  onError?: (cause: unknown) => void;
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  const fromEnv =
    typeof process !== "undefined" && process.env
      ? process.env.KODAMA_API_URL
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://api.kodama.dev";
}

export function createMeter(options: MeterOptions = {}): Meter {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const flushIntervalMs = options.flushIntervalMs ?? 5_000;
  const flushBatchSize = options.flushBatchSize ?? 50;
  const baseUrl = resolveBaseUrl(options.baseUrl);

  const buffer: UsageEvent[] = [];
  let totals = { responses: 0, toolCalls: 0 };
  let timer: ReturnType<typeof setInterval> | null = null;
  let flushing: Promise<void> | null = null;
  let stopped = false;

  const canPost = Boolean(
    options.projectId && options.projectSecret && fetcher,
  );

  function emit(event: UsageEvent) {
    if (stopped) return;
    buffer.push(event);
    if (event.kind === "response") totals.responses += 1;
    else totals.toolCalls += 1;
    if (buffer.length >= flushBatchSize) {
      void flush();
    }
    if (!timer && canPost) {
      timer = setInterval(() => {
        void flush();
      }, flushIntervalMs);
      // Don't keep the process alive just for the meter timer.
      if (typeof (timer as unknown as { unref?: () => void }).unref === "function") {
        (timer as unknown as { unref: () => void }).unref();
      }
    }
  }

  async function flush(): Promise<void> {
    if (!canPost || buffer.length === 0) return;
    if (flushing) return flushing;
    const batch = buffer.splice(0, buffer.length);
    flushing = (async () => {
      try {
        const url = `${baseUrl}/api/v1/projects/${encodeURIComponent(options.projectId!)}/usage`;
        const response = await fetcher!(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.projectSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ events: batch }),
        });
        if (!response.ok) {
          options.onError?.(new Error(`usage post failed (${response.status})`));
          // Best-effort: drop events on rejection. We optimise for not
          // blocking the agent loop, not for billing-grade reliability.
        }
      } catch (cause) {
        options.onError?.(cause);
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  return {
    recordResponse(event) {
      emit({ kind: "response", ts: Date.now(), platform: event?.platform });
    },
    recordToolCall(event) {
      emit({
        kind: "tool_call",
        ts: Date.now(),
        name: event.name,
        durationMs: event.durationMs ?? 0,
        ok: event.ok ?? true,
      });
    },
    async tool<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
      const started = Date.now();
      try {
        const result = await fn();
        emit({
          kind: "tool_call",
          ts: started,
          name,
          durationMs: Date.now() - started,
          ok: true,
        });
        return result;
      } catch (cause) {
        emit({
          kind: "tool_call",
          ts: started,
          name,
          durationMs: Date.now() - started,
          ok: false,
        });
        throw cause;
      }
    },
    snapshot() {
      return {
        responses: totals.responses,
        toolCalls: totals.toolCalls,
        pending: buffer.length,
      };
    },
    async flush() {
      await flush();
    },
    async stop() {
      stopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      await flush();
    },
  };
}
