/* OpenRouter client. The key comes from mobile/.env (EXPO_PUBLIC_OPENROUTER_KEY), which is gitignored.
   Note: any key bundled into a mobile app can be extracted from it. Before a public release, move these
   calls behind a server (for example a Neon Function) so the key never ships to phones. */
const KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'minimax/minimax-m3.1-flash:free';
/** Free models tried in order by OpenRouter when the first is busy or rate-limited. */
const FALLBACKS = ['google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free'];

export const aiReady = () => !!KEY;
type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

async function call(messages: Msg[], json: boolean, temperature: number): Promise<string> {
  if (!KEY) throw new Error('The AI coach isn’t set up. Add EXPO_PUBLIC_OPENROUTER_KEY to mobile/.env and restart the app.');
  let lastErr = 'The AI coach is busy. Try again in a moment.';
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    // Free models can be slow; give up after 90 s so the app never waits forever.
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Pulse' },
        // Low reasoning effort keeps replies fast (long hidden reasoning made plans take over a minute).
        body: JSON.stringify({ model: MODEL, models: [MODEL, ...FALLBACKS], messages, temperature, reasoning: { effort: 'low' }, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
      });
    } catch {
      clearTimeout(timer);
      throw new Error(ctrl.signal.aborted ? 'The AI coach took too long. Try again.' : 'No internet connection. Check your connection and try again.');
    }
    clearTimeout(timer);
    const data: any = await res.json().catch(() => ({}));
    const txt: string | undefined = data?.choices?.[0]?.message?.content;
    if (res.ok && txt) return txt;
    lastErr = data?.error?.message || lastErr;
    // Only rate limits and upstream hiccups are worth retrying.
    if (res.ok || !(res.status === 429 || res.status >= 500)) break;
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  throw new Error(/rate|limit|busy|timeout/i.test(lastErr) ? 'The AI coach is busy right now. Try again in a minute.' : lastErr);
}

/** Ask for JSON and parse it (tolerates code fences and stray text around the object). */
export async function ask(messages: Msg[], temperature = 0.4): Promise<any> {
  const txt = await call(messages, true, temperature);
  const t = txt.replace(/```(?:json)?/gi, ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The AI reply couldn’t be read. Try again.');
  try { return JSON.parse(t.slice(a, b + 1)); } catch { throw new Error('The AI reply couldn’t be read. Try again.'); }
}
/** Plain-text answer. */
export const askText = (messages: Msg[], temperature = 0.6) => call(messages, false, temperature);
