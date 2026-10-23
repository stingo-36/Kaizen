/* AI calls go through Pulse's own Neon Function (mobile/server/coach), which holds the OpenRouter key and
   picks the models, so no key ships in the app. The function checks the signed-in user's token on every call. */
import { fetch as streamFetch } from 'expo/fetch';

import { token } from './cloud';

const URL = process.env.EXPO_PUBLIC_COACH_URL || 'https://br-young-salad-a1ehycin-coach.compute.c-1.ap-southeast-1.aws.neon.tech/';

export const aiReady = () => true;
type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

async function call(messages: Msg[], opts: { json?: boolean; temperature: number; onText?: (soFar: string) => void }): Promise<string> {
  let auth: string;
  try { auth = await token(); } catch (e) {
    throw new Error((e as Error).message === 'signed-out' ? 'Sign in again to use the coach.' : 'No internet connection. Check your connection and try again.');
  }
  // Free models can be slow; give up after 90 s so the app never waits forever.
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await streamFetch(URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, temperature: opts.temperature, json: !!opts.json, stream: !!opts.onText }),
    });
    if (!res.ok) {
      const data: any = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'The AI coach is busy right now. Try again in a minute.');
    }
    if (!opts.onText) {
      const data: any = await res.json().catch(() => ({}));
      if (!data?.text) throw new Error('The AI coach is busy right now. Try again in a minute.');
      return data.text;
    }
    // Streamed: plain text that grows as the model writes.
    const reader = res.body!.getReader(), dec = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      opts.onText(text);
    }
    if (!text.trim()) throw new Error('The AI coach is busy right now. Try again in a minute.');
    return text;
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error('The AI coach took too long. Try again.');
    if (e instanceof TypeError) throw new Error('No internet connection. Check your connection and try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Ask for JSON and parse it (tolerates code fences and stray text around the object). */
export async function ask(messages: Msg[], temperature = 0.4): Promise<any> {
  const txt = await call(messages, { json: true, temperature });
  const t = txt.replace(/```(?:json)?/gi, ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The AI reply couldn’t be read. Try again.');
  try { return JSON.parse(t.slice(a, b + 1)); } catch { throw new Error('The AI reply couldn’t be read. Try again.'); }
}
/** Plain-text answer. Pass `onText` to get the reply as it's written (called with the whole text so far). */
export const askText = (messages: Msg[], temperature = 0.6, onText?: (soFar: string) => void) => call(messages, { temperature, onText });
