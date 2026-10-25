const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function source(name, mocks = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '../src/lib', name);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, loaded);
  loaded.require = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('.')) return source(path.relative(path.resolve(__dirname, '../src/lib'), path.resolve(path.dirname(filename), `${id}.ts`)), mocks, cache);
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return loaded.exports;
}
const planning = source('planning.ts');
const { newHabit } = source('habits.ts');
const dates = source('dates.ts');
const { normPlan, progressionFor } = source('workout.ts', { './ai': {} });
const emptyFood = { days: {}, recent: [] };
const habit = (options = {}) => newHabit({ id: 'h', name: 'Read', createdAt: '2026-10-01', ...options });

test('daily checklist merges real progress and includes due/overdue tasks only', () => {
  const tasks = [
    { id: 'due', subject: 'Due task', status: 'Open', dueDate: '2026-10-25', completedAt: null },
    { id: 'late', subject: 'Overdue task', status: 'Open', dueDate: '2026-10-24', completedAt: null },
    { id: 'future', status: 'Open', dueDate: '2026-10-26' },
    { id: 'undated', status: 'Open', dueDate: null },
  ];
  const items = planning.dayItems('2026-10-25', [habit({ log: { '2026-10-25': 1 } }), habit({ id: 'skipped', skips: { '2026-10-25': true } })],
    [{ date: '2026-10-25' }], { days: { '2026-10-25': [{ meal: 'breakfast' }] } }, 'Push', false, tasks);
  assert.equal(items.find((i) => i.id === 'habit:h').done, true);
  assert.equal(items.find((i) => i.id === 'workout').done, true);
  assert.equal(items.find((i) => i.id === 'meal:breakfast').done, true);
  assert.equal(items.find((i) => i.id === 'meal:lunch').done, false);
  assert.deepEqual(items.filter((i) => i.kind === 'task').map((i) => i.sourceId), ['due', 'late']);
  assert.equal(items.some((i) => i.id === 'habit:skipped'), false);
});
test('a recovery day completes the training item without creating a workout log', () => {
  const items = planning.dayItems('2026-10-25', [], [], emptyFood, null, true, []);
  assert.equal(items.find((i) => i.kind === 'workout').done, true);
});
test('weekly review excludes partial today and compares complete adjacent windows', () => {
  const log = {};
  for (let i = 0; i < 7; i++) log[dates.ymd(dates.addDays(dates.parse('2026-10-18'), i))] = 1;
  const result = planning.weeklyReview('2026-10-25', [habit({ log })], [{ date: '2026-10-24' }, { date: '2026-10-25' }],
    { days: { '2026-10-24': [{}], '2026-10-25': [{}] } }, 4);
  assert.equal(result.start, '2026-10-18'); assert.equal(result.end, '2026-10-24');
  assert.equal(result.current.habitRate, 100); assert.equal(result.previous.habitRate, 0);
  assert.equal(result.current.workouts, 1); assert.equal(result.current.mealDays, 1);
  assert.equal(result.wins.length, 3); assert.equal(result.goals.length, 3);
});
test('empty weekly history provides useful goals without invented completion', () => {
  const result = planning.weeklyReview('2026-10-25', [], [], emptyFood, 4);
  assert.equal(result.current.habitRate, null); assert.deepEqual(result.wins, []);
  assert.equal(result.goals.length, 3); assert.match(result.goals[0], /Create one/);
});
test('meal templates create independent entries and fresh ids without altering the source', () => {
  const template = { id: 't', name: 'Breakfast', meal: 'breakfast', entries: [{ grams: 100, item: { name: 'Oats', per100: { kcal: 100, p: 5, c: 10, f: 2 } } }] };
  let seq = 0;
  const first = planning.entriesFromTemplate(template, 'lunch', () => String(++seq), 123);
  const second = planning.entriesFromTemplate(template, 'breakfast', () => String(++seq), 456);
  first[0].item.per100.kcal = 200;
  assert.equal(template.entries[0].item.per100.kcal, 100);
  assert.equal(second[0].item.per100.kcal, 100);
  assert.notEqual(first[0].id, second[0].id);
  assert.equal(first[0].meal, 'lunch'); assert.equal(first[0].at, 123);
});
test('home ordering keeps each card once and safely handles boundaries', () => {
  const layout = planning.homeLayout({ order: ['tracker', 'tracker', 'unknown'], hidden: ['workout', 'unknown'] });
  assert.equal(layout.order[0], 'tracker'); assert.equal(new Set(layout.order).size, 7);
  assert.deepEqual(layout.hidden, ['workout']);
  assert.deepEqual(planning.moveHomeCard(layout, 'tracker', -1), layout);
  assert.equal(planning.moveHomeCard(layout, 'tracker', 1).order[1], 'tracker');
});
test('recovery check-in responds to low sleep, soreness and energy', () => {
  assert.equal(planning.recoveryAdvice({ energy: 5, soreness: 1, sleepHours: 4 }).level, 'Take it easy');
  assert.equal(planning.recoveryAdvice({ energy: 5, soreness: 4, sleepHours: 8 }).level, 'Take it easy');
  assert.equal(planning.recoveryAdvice({ energy: 3, soreness: 1, sleepHours: 8 }).level, 'Keep it comfortable');
  assert.equal(planning.recoveryAdvice({ energy: 5, soreness: 1, sleepHours: 8 }).level, 'Ready for your usual plan');
});
test('smart reminders suppress completed and skipped dates while preserving future reminders', () => {
  const now = new Date(2026, 9, 25, 8, 0);
  const h = habit({ reminder: '09:00', log: { '2026-10-25': 1 }, skips: { '2026-10-26': true } });
  const reminders = planning.reminderOccurrences([h], now);
  assert.equal(dates.ymd(reminders[0].date), '2026-10-27');
  assert.equal(reminders[0].date.getHours(), 9);
  assert.equal(reminders.length, 12);
});
test('smart reminders respect weekdays, goals, past times, malformed times and the queue cap', () => {
  const now = new Date(2026, 9, 25, 10, 0);
  const reminders = planning.reminderOccurrences([
    habit({ reminder: '09:00', days: [1], goal: 2, log: { '2026-10-26': 1 } }),
    habit({ id: 'bad', reminder: '25:99' }),
  ], now);
  assert.equal(reminders.length, 2); assert.equal(reminders[0].date.getDay(), 1);
  assert.equal(planning.reminderOccurrences([habit({ reminder: '09:00' })], now)[0].date.getDate(), 26);
  assert.equal(planning.reminderOccurrences(Array.from({ length: 10 }, (_, i) => habit({ id: String(i), reminder: '11:00' })), now).length, 60);
});
test('progression suggestions are previews until explicitly applied', () => {
  const plan = normPlan({ name: 'Test', days: [{ exercises: [{ name: 'Squat', sets: 3, reps: '8-10', weight: 40 }] }] });
  const log = { day: 0, exercises: [{ name: 'Squat', sets: Array.from({ length: 3 }, () => ({ done: true, w: 40, r: 10 })) }] };
  assert.equal(progressionFor(plan, log, 'just right', false).length, 1);
  assert.equal(plan.days[0].exercises[0].weight, 40);
  progressionFor(plan, log, 'just right', true);
  assert.equal(plan.days[0].exercises[0].weight, 42.5);
});
test('serialized notification refresh removes completed-day alerts and schedules only future dates', async () => {
  const calls = [], scheduled = [{ identifier: 'old-habit', content: { data: { kind: 'habit' } } }, { identifier: 'rest', content: { data: { kind: 'rest' } } }];
  const notifications = {
    AndroidImportance: { HIGH: 4, MAX: 5 }, SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: () => {}, setNotificationChannelAsync: async () => {},
    getAllScheduledNotificationsAsync: async () => scheduled,
    cancelScheduledNotificationAsync: async (id) => calls.push(['cancel', id]),
    getPermissionsAsync: async () => ({ granted: true }),
    scheduleNotificationAsync: async (request) => calls.push(['schedule', request]),
  };
  const api = source('notifications.ts', { 'react-native': { Platform: { OS: 'android' } }, 'expo-notifications': notifications });
  const now = new Date(), key = dates.ymd(now);
  const sync1 = api.syncHabitReminders([habit({ reminder: '23:59' })]);
  await Promise.resolve();
  const sync2 = api.syncHabitReminders([habit({ reminder: '23:59', log: { [key]: 1 } })]);
  await Promise.all([sync1, sync2]);
  assert.equal(calls.some(([kind, id]) => kind === 'cancel' && id === 'rest'), false);
  assert.equal(calls.filter(([kind]) => kind === 'cancel').length, 2);
  const lastCancel = calls.map(([kind]) => kind).lastIndexOf('cancel');
  for (const [kind, request] of calls.slice(lastCancel + 1)) {
    if (kind === 'schedule') { assert.equal(request.trigger.type, 'date'); assert.notEqual(dates.ymd(request.trigger.date), key); }
  }
});
test('progression never increases targets after reduced load or too few sets', () => {
  const plan = normPlan({ days: [{ exercises: [{ name: 'Squat', sets: 3, reps: '8-10', weight: 40 }] }] });
  const log = { day: 0, exercises: [{ name: 'Squat', sets: Array.from({ length: 3 }, () => ({ done: true, w: 30, r: 10 })) }] };
  assert.deepEqual(progressionFor(plan, log, 'easy', false), []);
  log.exercises[0].sets = [{ done: true, w: 40, r: 10 }];
  assert.deepEqual(progressionFor(plan, log, 'easy', false), []);
});
test('missed targets produce a real reduction and capped cardio produces no fake increase', () => {
  const plan = normPlan({ days: [{ exercises: [{ name: 'Squat', sets: 3, reps: '8-10', weight: 20 }, { name: 'Walk', kind: 'cardio', minutes: 180 }] }] });
  const log = { day: 0, exercises: [{ name: 'Squat', sets: Array.from({ length: 3 }, () => ({ done: true, w: 20, r: 5 })) }, { name: 'Walk', cardio: { done: true, minutes: 180 }, sets: [] }] };
  const changes = progressionFor(plan, log, 'easy', true);
  assert.equal(changes.length, 1); assert.equal(changes[0].dir, 'down');
  assert.equal(plan.days[0].exercises[0].weight, 17.5);
});
