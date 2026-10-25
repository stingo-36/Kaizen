const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function source(name, mocks = {}) {
  const filename = path.resolve(__dirname, '../server/coach', name);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
  return loaded.exports;
}
const { createGroqClient, textOnly, TEXT_MODELS, VISION_MODEL } = source('groq.ts');
const pause = async () => {};
const completion = (content) => Response.json({ choices: [{ message: { content } }] });

test('Groq requests keep the key server-side and use one compatible model per request', async () => {
  let call;
  const request = createGroqClient('test-only-key', { pause, fetcher: async (url, init) => { call = { url, ...init }; return completion('ok'); } });
  const response = await request({ messages: [{ role: 'user', content: 'Hello' }], stream: true });
  assert.equal(response.ok, true);
  assert.equal(call.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(call.headers.Authorization, 'Bearer test-only-key');
  const body = JSON.parse(call.body);
  assert.equal(body.model, TEXT_MODELS[0]); assert.equal(body.stream, true);
  assert.equal(body.reasoning_effort, 'low');
  assert.equal('models' in body, false); assert.equal('reasoning' in body, false);
  assert.equal(call.body.includes('test-only-key'), false);
});
test('Groq retries transient errors using the fallback model', async () => {
  const models = [];
  const request = createGroqClient('test-only-key', { pause, fetcher: async (_url, init) => {
    models.push(JSON.parse(init.body).model);
    return models.length === 1 ? Response.json({ error: { message: 'quota' } }, { status: 429 }) : completion('ok');
  } });
  assert.equal((await request({})).ok, true);
  assert.deepEqual(models, TEXT_MODELS);
});
test('Groq authentication errors are sanitized and never retried or leaked', async () => {
  let calls = 0;
  const request = createGroqClient('test-only-key', { pause, fetcher: async () => {
    calls++; return Response.json({ error: { message: 'private provider details test-only-key' } }, { status: 401 });
  } });
  const result = await request({});
  assert.equal(calls, 1); assert.equal(typeof result, 'string');
  assert.equal(result.includes('test-only-key'), false); assert.equal(result.includes('private'), false);
});
test('vision calls use instruct mode and JSON output without text-only fallback', async () => {
  let body;
  const request = createGroqClient('test-only-key', { pause, fetcher: async (_url, init) => { body = JSON.parse(init.body); return completion('{}'); } });
  await request({ response_format: { type: 'json_object' } }, [VISION_MODEL]);
  assert.equal(body.model, VISION_MODEL); assert.equal(body.reasoning_effort, 'none');
  assert.equal(body.response_format.type, 'json_object');
});
test('SSE text survives split UTF-8, keepalives and the final event without a newline', async () => {
  const text = ':keepalive\ndata: {"choices":[{"delta":{"content":"Hi 🙂"}}]}\n\ndata: {"choices":[{"delta":{"content":" there"}}]}';
  const bytes = new TextEncoder().encode(text);
  const input = new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 2) controller.enqueue(bytes.slice(i, i + 2));
    controller.close();
  } });
  assert.equal(await new Response(textOnly(input)).text(), 'Hi 🙂 there');
});
function coach(fetcher) {
  const original = { key: process.env.GROQ_API_KEY, jwks: process.env.NEON_AUTH_JWKS_URL, auth: process.env.NEON_AUTH_BASE_URL };
  process.env.GROQ_API_KEY = 'test-only-key'; process.env.NEON_AUTH_JWKS_URL = 'https://auth.example.test/jwks'; process.env.NEON_AUTH_BASE_URL = 'https://auth.example.test/auth';
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
    const groq = source('groq.ts');
    return source('index.ts', {
      './groq': groq,
      jose: { createRemoteJWKSet: () => ({}), jwtVerify: async (token) => { if (token !== 'valid-test-token') throw new Error('bad token'); return { payload: { sub: 'test-user' } }; } },
    }).default;
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries({ GROQ_API_KEY: original.key, NEON_AUTH_JWKS_URL: original.jwks, NEON_AUTH_BASE_URL: original.auth })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
const req = (body, token = 'valid-test-token') => new Request('https://coach.example.test/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
});
test('the existing coach contract preserves authentication and JSON responses', async () => {
  let calls = 0;
  const handler = coach(async (_url, init) => { calls++; assert.equal(JSON.parse(init.body).response_format.type, 'json_object'); return completion('{"ok":true}'); });
  assert.equal((await handler.fetch(req({ messages: [] }, ''))).status, 401);
  assert.equal((await handler.fetch(req({ messages: [] }, 'wrong-token'))).status, 401);
  assert.equal(calls, 0);
  const response = await handler.fetch(req({ messages: [{ role: 'user', content: 'Return JSON' }], json: true }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { text: '{"ok":true}' });
});
test('six screenshots are read in three-image batches and merged without duplicates', async () => {
  const batches = [];
  const handler = coach(async (_url, init) => {
    const body = JSON.parse(init.body); batches.push(body);
    return completion(JSON.stringify({ title: 'Saved tools', summary: 'Tools to try.', type: 'Tool',
      items: [{ name: 'Shared tool', what: 'One tool', url: null }, { name: `Tool ${batches.length}`, what: 'Another tool', url: null }], tags: ['tools'] }));
  });
  const response = await handler.fetch(req({ action: 'resource', images: Array(6).fill('data:image/png;base64,AAAA'), types: ['Tool'] }));
  const result = await response.json();
  assert.equal(response.status, 200); assert.equal(batches.length, 2);
  for (const body of batches) {
    assert.equal(body.model, VISION_MODEL);
    assert.equal(body.messages[0].content.filter((part) => part.type === 'image_url').length, 3);
  }
  assert.equal(result.items.length, 3); assert.equal(result.resource.type, 'Tool');
});
