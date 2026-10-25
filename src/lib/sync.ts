import type { Habit } from './habits';

/** Merge remote habits without resurrecting locally deleted records. */
export function mergeHabits(local: Habit[], rows: { id: string; data: Habit; deleted: boolean }[], baseline: Record<string, string>) {
  const localById = new Map(local.map((h) => [h.id, h]));
  const dirty = new Set(local.filter((h) => baseline[h.id] !== JSON.stringify(h)).map((h) => h.id));
  const live = rows.filter((r) => !r.deleted);
  const visible = live.filter((r) => !(r.id in baseline) || localById.has(r.id));
  return {
    habits: [
      ...visible.map((r) => dirty.has(r.id) ? localById.get(r.id)! : r.data),
      ...local.filter((h) => dirty.has(h.id) && !visible.some((r) => r.id === h.id)),
    ],
    // Keep remote values here so the next push can detect edits and deletions.
    baseline: Object.fromEntries(live.map((r) => [r.id, JSON.stringify(r.data)])),
  };
}

/** Coalesce overlapping requests, then run again for changes made during an upload. */
export function serialTask(): (task: () => Promise<void>) => Promise<void> {
  let pending: (() => Promise<void>) | null = null;
  let running: Promise<void> | null = null;
  return (task) => {
    pending = task;
    if (!running) {
      running = Promise.resolve().then(async () => {
        try {
          while (pending) { const next = pending; pending = null; await next(); }
        } finally { running = null; }
      });
    }
    return running;
  };
}
