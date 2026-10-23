/* Pulse Coach: a Neon Function that makes every AI call for the app, so the OpenRouter key never ships to phones.
   Callers must send a Neon Auth JWT (the same short-lived token the app uses for the Data API).
   POST { messages, json?, temperature?, stream? }
     stream: true  → plain-text body that grows as the model writes
     otherwise     → { text }
   Errors are always { error } with a matching status, before any text is sent.
   Deploy: npm run build, then deploy function.zip with OPENROUTER_KEY in its environment (see README.md). */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwks = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
const issuer = new URL(process.env.NEON_AUTH_BASE_URL!).origin;
const KEY = process.env.OPENROUTER_KEY ?? '';

/** Tried in order by OpenRouter (it takes at most 3). The paid model is used whenever the account has credit;
   with none, OpenRouter falls through to the free ones. */
const MODELS = (process.env.OPENROUTER_MODELS || 'minimax/minimax-m3.1-flash,nvidia/nemotron-3.5-lightning:free,nvidia/nemotron-3-ultra-550b-a55b:free')
  .split(',').map((m) => m.trim()).filter(Boolean).slice(0, 3);

/* Guard rails so a leaked token can't run up a bill. */
const MAX_MESSAGES = 30, MAX_CHARS = 24000, PER_10_MIN = 40;
const hits = new Map<string, number[]>();
function limited(user: string) {
  const now = Date.now(), recent = (hits.get(user) ?? []).filter((t) => now - t < 600_000);
  recent.push(now); hits.set(user, recent);
  return recent.length > PER_10_MIN;
}

const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});
const fail = (req: Request, status: number, error: string) => Response.json({ error }, { status, headers: cors(req) });

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };
const valid = (m: unknown): m is Msg =>
  !!m && typeof m === 'object' && ['system', 'user', 'assistant'].includes((m as Msg).role) && typeof (m as Msg).content === 'string';

/** Calls OpenRouter, retrying rate limits and upstream hiccups. Returns the first OK response or a friendly error. */
async function openrouter(body: object): Promise<Response | string> {
  let lastErr = 'The AI coach is busy. Try again in a moment.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Pulse' },
      body: JSON.stringify({ model: MODELS[0], models: MODELS, reasoning: { effort: 'low' }, ...body }),
      signal: AbortSignal.timeout(90_000),
    }).catch(() => null);
    if (!res) return 'The AI coach took too long. Try again.';
    if (res.ok) return res;
    const data: any = await res.json().catch(() => ({}));
    lastErr = data?.error?.message || lastErr;
    if (!(res.status === 429 || res.status >= 500)) break;
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  return /rate|limit|busy|timeout|provider returned/i.test(lastErr) ? 'The AI coach is busy right now. Try again in a minute.' : lastErr;
}

/** Turns OpenRouter's SSE stream into plain text deltas. */
function textOnly(src: ReadableStream<Uint8Array>) {
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = '';
  return src.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, out) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (delta) out.enqueue(enc.encode(delta));
        } catch { /* keep-alive or partial line */ }
      }
    },
  }));
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'POST') return fail(req, 405, 'Use POST');

    const auth = req.headers.get('authorization');
    if (!auth?.toLowerCase().startsWith('bearer ')) return fail(req, 401, 'Sign in to use the coach.');
    let user: string;
    try { user = String((await jwtVerify(auth.slice(7), jwks, { issuer })).payload.sub); } catch { return fail(req, 401, 'Sign in to use the coach.'); }
    if (!KEY) return fail(req, 500, 'The AI coach isn’t set up on the server yet.');
    if (limited(user)) return fail(req, 429, 'That’s a lot of questions. Take a breather and try again in a few minutes.');

    const body: any = await req.json().catch(() => null);
    const messages: unknown[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length || messages.length > MAX_MESSAGES || !messages.every(valid)) return fail(req, 400, 'That message couldn’t be sent.');
    if (messages.reduce((a, m) => a + (m as Msg).content.length, 0) > MAX_CHARS) return fail(req, 413, 'That conversation is too long. Clear the chat and try again.');
    const temperature = typeof body.temperature === 'number' ? Math.min(1.2, Math.max(0, body.temperature)) : 0.6;
    const stream = body.stream === true && !body.json;

    const res = await openrouter({ messages, temperature, stream, ...(body.json ? { response_format: { type: 'json_object' } } : {}) });
    if (typeof res === 'string') return fail(req, 502, res);

    if (stream && res.body) {
      return new Response(textOnly(res.body), { headers: { ...cors(req), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
    }
    const data: any = await res.json().catch(() => ({}));
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text ? Response.json({ text }, { headers: cors(req) }) : fail(req, 502, 'The AI coach is busy right now. Try again in a minute.');
  },
};
