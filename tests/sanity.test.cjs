const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function source(name, mocks = {}) {
  const filename = path.resolve(__dirname, '../src/lib', name);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  loaded._compile(result.outputText, filename);
  return loaded.exports;
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const { mergeHabits, serialTask } = source('sync.ts');
const serialized = (task) => { const run = serialTask(); return () => run(task); };
const habit = (id, name = id) => ({ id, name });
const row = (h, deleted = false) => ({ id: h.id, data: h, deleted });

test('an offline deletion stays deleted and remains eligible for upload', () => {
  const h = habit('a');
  const result = mergeHabits([], [row(h)], { a: JSON.stringify(h) });
  assert.deepEqual(result.habits, []);
  assert.equal(result.baseline.a, JSON.stringify(h));
});
test('fresh devices receive remote habits and unsynced edits win', () => {
  const old = habit('a'), edited = habit('a', 'edited'), remote = habit('b');
  assert.deepEqual(mergeHabits([], [row(old)], {}).habits, [old]);
  const result = mergeHabits([edited], [row(old), row(remote)], { a: JSON.stringify(old) });
  assert.deepEqual(result.habits, [edited, remote]);
  assert.equal(result.baseline.a, JSON.stringify(old));
});
test('remote deletion removes unchanged habits but keeps unsynced edits', () => {
  const old = habit('a'), edited = habit('a', 'edited'), baseline = { a: JSON.stringify(old) };
  assert.deepEqual(mergeHabits([old], [row(old, true)], baseline).habits, []);
  assert.deepEqual(mergeHabits([edited], [row(old, true)], baseline).habits, [edited]);
});
test('edits made during an upload get a second pass without overlapping requests', async () => {
  const gate = deferred();
  const uploaded = [];
  let value = 'first', active = 0;
  const push = serialized(async () => {
    assert.equal(++active, 1);
    uploaded.push(value);
    if (uploaded.length === 1) await gate.promise;
    active--;
  });
  const first = push();
  await Promise.resolve();
  value = 'second';
  const second = push();
  assert.equal(first, second);
  gate.resolve();
  await second;
  assert.deepEqual(uploaded, ['first', 'second']);
});
test('a failed serialized task can be retried', async () => {
  let attempts = 0;
  const run = serialized(async () => { if (++attempts === 1) throw new Error('offline'); });
  await assert.rejects(run(), /offline/);
  await run();
  assert.equal(attempts, 2);
});

const workout = source('workout.ts', { './dates': { uid: () => 'id' }, './ai': {} });
test('cardio without a MET estimate uses the intensity fallback', () => {
  for (const met of [undefined, null, 0, -3, Infinity, 'bad']) {
    assert.equal(workout.normExercise({ kind: 'cardio', met }).met, 0);
  }
  assert.equal(workout.normExercise({ kind: 'cardio', met: 7 }).met, 7);
});
test('invalid workout day indexes cannot crash a session', () => {
  const plan = { id: 'p', days: [{ exercises: [] }, { exercises: [] }] };
  for (const index of [-1, NaN, Infinity, 0.5]) assert.equal(workout.newSession(plan, index).day, 0);
  assert.equal(workout.newSession(plan, 99).day, 1);
  assert.throws(() => workout.newSession({ ...plan, days: [] }, 0), /Add a workout day/);
});

// Exercise the providers' async handlers with deterministic hook state and deferred network replies.
function providerHarness(file, api, apiName, exportName, extraMocks = {}) {
  const slots = [];
  let cursor = 0;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState: (initial) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (v) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }];
    },
    useCallback: (fn) => fn,
    useEffect: () => {},
  };
  const provider = source(file, {
    react, 'react/jsx-runtime': { jsx: (_type, props) => props },
    'react-native': { Platform: { OS: 'android' } }, ...extraMocks, './store': { useStore: () => ({ me: 'user' }) }, [apiName]: api,
  })[exportName];
  return () => { cursor = 0; return provider({ children: null }).value; };
}
test('SpendWise replies arriving after disconnect cannot restore data or cache', async () => {
  const gate = deferred(); let writes = 0;
  const render = providerHarness('spend-store.tsx', {
    connectSpendWise: async () => ({}), thisMonth: () => '2026-10', fetchSummary: () => gate.promise,
    clearLink: async () => {}, writeCache: () => writes++, SpendAuthError: class extends Error {},
  }, './spend', 'SpendProvider');
  const connecting = render().connect('url', 'email', 'password');
  await Promise.resolve();
  await render().disconnect();
  gate.resolve({ month: '2026-10' });
  await connecting;
  assert.equal(render().status, 'off');
  assert.equal(render().busy, false);
  assert.deepEqual(render().summaries, {});
  assert.equal(writes, 0);
});
test('WorkNest late replies cannot restore disconnected entries or resources', async () => {
  const entries = deferred(), resources = deferred(); let writes = 0;
  const render = providerHarness('worknest-store.tsx', {
    NO_OPTIONS: {}, connectWorkNest: async () => ({}), fetchEntries: () => entries.promise,
    fetchResources: () => resources.promise, clearLink: async () => {},
    writeCache: () => writes++, writeResourceCache: () => writes++, NestAuthError: class extends Error {},
  }, './worknest', 'WorkNestProvider');
  const connecting = render().connect('email', 'password');
  await Promise.resolve();
  await render().disconnect();
  entries.resolve({ entries: [{ id: 'secret' }] }); resources.resolve({ resources: [{ id: 'secret' }], types: [] });
  await connecting;
  assert.equal(render().status, 'off');
  assert.equal(render().busy, false);
  assert.deepEqual(render().entries, []);
  assert.deepEqual(render().resources, []);
  assert.equal(writes, 0);
});
test('WorkNest auth failures reject edits and roll back the optimistic completion', async () => {
  class AuthError extends Error {}
  const render = providerHarness('worknest-store.tsx', {
    NO_OPTIONS: {}, connectWorkNest: async () => ({}),
    fetchEntries: async () => ({ entries: [{ id: 'a', status: 'Open', completedAt: null }] }),
    fetchResources: async () => ({ resources: [], types: [] }),
    patchEntry: async () => { throw new AuthError('expired'); }, writeCache: () => {}, writeResourceCache: () => {}, NestAuthError: AuthError,
  }, './worknest', 'WorkNestProvider');
  await render().connect('email', 'password');
  await assert.rejects(render().setDone('a', true), /expired/);
  assert.equal(render().status, 'expired');
  assert.equal(render().entries[0].status, 'Open');
});

test('revoked Health Connect access clears readings and ignores an older request', async () => {
  const old = deferred(); let reads = 0, removed = 0, writes = 0, grants = ['Steps'];
  const empty = { steps: null, at: 0 };
  const render = providerHarness('health-store.tsx', {
    healthStatus: async () => 'ready', grantedTypes: async () => grants,
    readHealthToday: async () => ++reads === 1 ? { steps: 123, at: 1 } : old.promise,
  }, './health', 'HealthProvider', {
    './health-types': { emptySummary: () => ({ ...empty }) },
    '@react-native-async-storage/async-storage': {
      setItem: async () => { writes++; }, removeItem: async () => { removed++; },
    },
  });
  await render().refresh();
  assert.equal(render().data.steps, 123);
  const pending = render().refresh();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  grants = [];
  await render().refresh();
  old.resolve({ steps: 999, at: 2 });
  await pending;
  assert.deepEqual(render().data, empty);
  assert.deepEqual(render().granted, []);
  assert.equal(render().busy, false);
  assert.equal(removed, 1);
  assert.equal(writes, 1);
});

for (const [file, method, args] of [
  ['spend.ts', 'connectSpendWise', ['https://example.com', 'test@example.com', 'test-password']],
  ['worknest.ts', 'connectWorkNest', ['test@example.com', 'test-password']],
]) {
  test(`${method} does not save credentials after its connection is cancelled`, async (t) => {
    let writes = 0;
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: true, status: 200, url: 'https://example.com/api/mobile/connect',
      headers: { get: () => 'application/json' }, json: async () => ({ token: 'test-token', email: 'test@example.com' }),
    }));
    const api = source(file, {
      'react-native': { Platform: { OS: 'android' } },
      'expo-secure-store': { setItemAsync: async () => { writes++; } },
      '@react-native-async-storage/async-storage': {},
      './spend': { normalizeUrl: (url) => url },
    });
    await assert.rejects(api[method](...args, () => false), /Connection cancelled/);
    assert.equal(writes, 0);
  });
}
