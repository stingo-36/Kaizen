/* Pulse Coach: a Neon Function that makes every AI call for the app, so the OpenRouter key never ships to phones.
   Callers must send a Neon Auth JWT (the same short-lived token the app uses for the Data API).
   POST { messages, json?, temperature?, stream? }
     stream: true  → plain-text body that grows as the model writes
     otherwise     → { text }
   POST { action: 'resource', link?, images?, types } → a WorkNest resource built from a shared link and screenshots
     (images are data URLs; they're only passed to the model and never stored)
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
/** Models that can read images, for screenshots. Same rule: paid first, free when there's no credit. */
const VISION_MODELS = (process.env.OPENROUTER_VISION_MODELS || 'minimax/minimax-m3.1-flash,nvidia/nemotron-3.5-super-vl:free,google/gemma-4-31b-it:free')
  .split(',').map((m) => m.trim()).filter(Boolean).slice(0, 3);

/* Guard rails so a leaked token can't run up a bill. */
const MAX_MESSAGES = 30, MAX_CHARS = 24000, PER_10_MIN = 40;
const MAX_IMAGES = 6, MAX_IMAGE_CHARS = 2_000_000;
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
async function openrouter(body: object, models = MODELS): Promise<Response | string> {
  let lastErr = 'The AI coach is busy. Try again in a moment.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Pulse' },
      body: JSON.stringify({ model: models[0], models, reasoning: { effort: 'low' }, ...body }),
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

/* ---------- shared links → WorkNest resources ---------- */
type LinkInfo = { url: string; site: string; author: string | null; caption: string | null };

const decode = (t: string) => t.replace(/&quot;/g, '"').replace(/&#039;|&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
const meta = (html: string, key: string) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)`, 'i'))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i'));
  return m ? decode(m[1]).trim() : null;
};

/** The public preview of a shared link (what a chat app shows): title, caption and creator. Never logged in, never the video. */
async function linkInfo(raw: string): Promise<LinkInfo | null> {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  // Public web pages only: no other schemes, no local or bare-IP hosts.
  if (url.protocol !== 'https:' || /^(localhost|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(url.hostname) || !url.hostname.includes('.')) return null;
  const site = url.hostname.replace(/^www\./, '');
  const base: LinkInfo = { url: url.toString(), site, author: null, caption: null };
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'facebookexternalhit/1.1', Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return base;
    const html = (await res.text()).slice(0, 800_000);
    const desc = meta(html, 'description') ?? meta(html, 'og:description');
    const title = meta(html, 'og:title') ?? meta(html, 'twitter:title');
    if (/instagram\.com$/.test(site) && desc) {
      // "3,144 likes, 383 comments - creator on October 7, 2026: "caption"."
      const m = desc.match(/-\s*([\w.]+)\s+on\s+[^:]+:\s*"([\s\S]*)"\.?$/);
      return { ...base, author: m ? `@${m[1]}` : null, caption: (m ? m[2] : desc).slice(0, 2000) };
    }
    return { ...base, author: meta(html, 'og:site_name'), caption: [title, desc].filter(Boolean).join(' — ').slice(0, 2000) || null };
  } catch {
    return base;
  }
}

/** Pull the JSON object out of a model reply (tolerates code fences and chatter). */
function parseJson(text: string): any {
  const t = text.replace(/```(?:json)?/gi, ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const safeUrl = (v: unknown) => { try { const u = new URL(String(v)); return /^https?:$/.test(u.protocol) ? u.toString() : null; } catch { return null; } };
const tag = (v: string) => v.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);

type Item = { name: string; what: string; url: string | null; suggested: boolean };

/** Builds the resource WorkNest will store. Description is Markdown, like the Resources page writes. */
async function buildResource(req: Request, body: any) {
  const types: string[] = Array.isArray(body.types) ? body.types.filter((t: unknown) => typeof t === 'string').slice(0, 40) : [];
  const images: string[] = Array.isArray(body.images) ? body.images : [];
  if (images.length > MAX_IMAGES) return fail(req, 413, `Pick up to ${MAX_IMAGES} screenshots.`);
  if (!images.every((i) => typeof i === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(i) && i.length <= MAX_IMAGE_CHARS)) return fail(req, 400, 'Those screenshots couldn’t be read.');
  const link = typeof body.link === 'string' && body.link.trim() ? await linkInfo(body.link) : null;
  if (!link && !images.length) return fail(req, 400, 'Share a link or add a screenshot first.');

  const typeList = types.length ? types : ['Website', 'App', 'Link', 'Tool', 'Documentation', 'Reference', 'Learning', 'Other'];
  const prompt = `You turn something the user saved (a social media post or web page, plus optional screenshots of it) into one entry for their resource library.
${link ? `Link: ${link.url}\nSite: ${link.site}\nCreator: ${link.author ?? 'unknown'}\nCaption: ${link.caption ?? '(none)'}` : 'No link, screenshots only.'}
${images.length ? `There are ${images.length} screenshot(s). Read every tool, app, website, extension, book, command or link shown in them.` : 'There are no screenshots.'}

Reply with JSON only:
{"title": short descriptive title (max 80 chars, no emoji),
 "type": exactly one of ${JSON.stringify(typeList)},
 "summary": one plain sentence on what this is and why it's useful,
 "items": [{"name": "...", "what": "what it does, max 12 words", "url": "link or null", "seen": true if the link is written in the screenshots or caption, false if you are suggesting the official one}],
 "tags": up to 5 short lowercase topic tags}
Only list items that really appear in the caption or screenshots; never invent items. Use "url": null when you aren't sure of the official link. "items" may be empty.`;

  const content: object[] = [{ type: 'text', text: prompt }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))];
  const res = await openrouter({ messages: [{ role: 'user', content }], temperature: 0.2 }, images.length ? VISION_MODELS : MODELS);
  if (typeof res === 'string') return fail(req, 502, res);
  const data: any = await res.json().catch(() => ({}));
  const out = parseJson(data?.choices?.[0]?.message?.content ?? '');
  if (!out) return fail(req, 502, 'The screenshots couldn’t be read this time. Try again.');

  const items: Item[] = (Array.isArray(out.items) ? out.items : []).slice(0, 25).map((i: any) => {
    const url = safeUrl(i?.url);
    return { name: clean(i?.name, 120), what: clean(i?.what, 160), url, suggested: !!url && i?.seen !== true };
  }).filter((i: Item) => i.name);
  const type = typeList.find((t) => t.toLowerCase() === String(out.type ?? '').toLowerCase()) ?? (typeList.includes('Other') ? 'Other' : typeList[0]);
  // The AI's tags read better than run-together hashtags (#ChromeExtension); hashtags are the fallback.
  const aiTags = (Array.isArray(out.tags) ? out.tags : []).map((t: unknown) => tag(String(t))).filter(Boolean);
  const topic = aiTags.length ? aiTags : (link?.caption?.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(tag);
  const tags = [...new Set([...topic.slice(0, 5), ...(link && /instagram\.com$/.test(link.site) ? ['instagram'] : [])])];
  const summary = clean(out.summary, 400);
  const source = link ? `From ${link.author ? `${link.author} on ` : ''}${/instagram\.com$/.test(link.site) ? 'Instagram' : link.site}.` : '';
  const list = items.map((i, n) => `${n + 1}. **${i.name}**${i.what ? ` — ${i.what}` : ''}${i.url ? ` [${i.suggested ? 'Suggested link' : 'Link'}](${i.url})` : ''}`).join('\n');
  const description = [summary, source, list].filter(Boolean).join('\n\n').slice(0, 5000);
  const title = clean(out.title, 120) || clean(link?.caption, 80) || 'Saved resource';

  return Response.json({
    resource: { title, type, url: link?.url ?? null, description, tags },
    items,
    source: link ? { site: link.site, author: link.author, caption: link.caption } : null,
    // The link alone gave a topic but nothing to list: the screenshots hold the details.
    needsScreenshots: !images.length && !items.length,
  }, { headers: cors(req) });
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
    if (body?.action === 'resource') return buildResource(req, body);
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
