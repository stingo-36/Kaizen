/** Groq-only transport. Secrets are supplied by the Neon function environment. */
export const TEXT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
export const VISION_MODEL = 'qwen/qwen3.8-27b';
export const VISION_BATCH_SIZE = 3;

const BUSY = 'The AI coach is busy right now. Try again in a minute.';
const UNAVAILABLE = 'The AI coach couldn’t connect to its AI service. Please try again later.';

type Options = { fetcher?: typeof fetch; pause?: (ms: number) => Promise<void> };
export function createGroqClient(key: string, { fetcher = fetch, pause = (ms) => new Promise((r) => setTimeout(r, ms)) }: Options = {}) {
  return async (body: object, models: string[] = TEXT_MODELS): Promise<Response | string> => {
    if (!key || !models.length) return UNAVAILABLE;
    const deadline = Date.now() + 70_000;
    for (let attempt = 0; attempt < 3; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return 'The AI coach took too long. Try again.';
      const model = models[Math.min(attempt, models.length - 1)];
      const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, model, max_completion_tokens: 8192,
          ...(model.startsWith('qwen/') ? { reasoning_effort: 'none' } : model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low' } : {}),
        }),
        signal: AbortSignal.timeout(Math.min(30_000, remaining)),
      }).catch(() => null);
      if (response?.ok) return response;
      // Consume failed responses without returning provider details or credentials to the app.
      if (response) await response.text().catch(() => {});
      if (response && (response.status === 401 || response.status === 403)) return UNAVAILABLE;
      if (response && response.status !== 429 && response.status !== 404 && response.status < 500) return 'The AI coach couldn’t process that request. Try again.';
      if (attempt < 2) await pause(1200 * (attempt + 1));
    }
    return BUSY;
  };
}

/** Groq uses OpenAI-style SSE. Emit text only, including a final event without a newline. */
export function textOnly(src: ReadableStream<Uint8Array>) {
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = '';
  const emit = (line: string, out: TransformStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (data === '[DONE]') return;
    try {
      const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta) out.enqueue(enc.encode(delta));
    } catch { /* keep-alive or non-content event */ }
  };
  return src.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, out) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      lines.forEach((line) => emit(line, out));
    },
    flush(out) { emit(buf + dec.decode(), out); },
  }));
}
