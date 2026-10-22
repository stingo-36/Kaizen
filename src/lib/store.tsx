import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as cloud from './cloud';
import { CloudUser } from './cloud';
import { Habit } from './habits';
import { syncHabitReminders } from './notifications';
import { emptyProfile, migrateProfile, Profile } from './profile';
import { emptyWorkout, migrateWorkout, SessionLog, WorkoutData } from './workout';

/* Data flow: every change is written to the phone at once (works offline), then pushed to Neon
   ~1 s later. On launch and when the app returns to the foreground, the latest rows are pulled. */

/** Demo sign-in shortcut: test1 / test1 maps to the demo account (the auth service needs 8+ character passwords). */
export const DEMO = { username: 'test1', password: 'test1', email: 'test1@pulse.app', cloudPassword: 'test1-pulse-demo' };
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

const K = {
  habits: (u: string) => `pulse.c.habits.${u}`,
  workout: (u: string) => `pulse.c.workout.${u}`,
  profile: (u: string) => `pulse.c.profile.${u}`,
  synced: (u: string) => `pulse.c.synced.${u}`,
};
type Synced = { habits: Record<string, string>; state: string; sessions: string[]; profile: string };
const emptySynced = (): Synced => ({ habits: {}, state: '', sessions: [], profile: '' });

const readJSON = async <T,>(key: string, fallback: T): Promise<T> => {
  try { const v = await AsyncStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const writeJSON = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});
const stateOf = (w: WorkoutData) => JSON.stringify({ plans: w.plans, active_plan_id: w.activePlanId, last_changes: w.lastChanges, sel_day: w.selDay });

type Store = {
  ready: boolean;
  me: string | null;
  user: CloudUser | null;
  profile: Profile;
  habits: Habit[];
  workout: WorkoutData;
  sync: SyncStatus;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  setProfile: (fn: (p: Profile) => Profile) => void;
  setHabits: (fn: (h: Habit[]) => Habit[]) => void;
  setWorkout: (fn: (w: WorkoutData) => WorkoutData) => void;
  syncNow: () => void;
};
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<CloudUser | null>(null);
  const [profile, setProfileState] = useState<Profile>(emptyProfile());
  const [habits, setHabitsState] = useState<Habit[]>([]);
  const [workout, setWorkoutState] = useState<WorkoutData>(emptyWorkout());
  const [sync, setSync] = useState<SyncStatus>('idle');

  // Latest values for the async sync code (refs are only touched in callbacks and effects).
  const uid = useRef<string | null>(null);
  const cur = useRef<{ habits: Habit[]; workout: WorkoutData; profile: Profile }>({ habits: [], workout: emptyWorkout(), profile: emptyProfile() });
  const synced = useRef<Synced>(emptySynced());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushing = useRef(false);

  const resetLocal = useCallback(() => {
    uid.current = null; synced.current = emptySynced(); cur.current = { habits: [], workout: emptyWorkout(), profile: emptyProfile() };
    setUser(null); setHabitsState([]); setWorkoutState(emptyWorkout()); setProfileState(emptyProfile()); setSync('idle');
  }, []);

  /** Push everything that changed since the last successful sync. */
  const push = useCallback(async () => {
    const u = uid.current;
    if (!u || pushing.current) return;
    pushing.current = true;
    setSync('syncing');
    try {
      const { habits: hs, workout: w, profile: p } = cur.current, s = synced.current;
      const now = new Date().toISOString();
      const changed = hs.filter((h) => s.habits[h.id] !== JSON.stringify(h));
      const removed = Object.keys(s.habits).filter((id) => !hs.some((h) => h.id === id));
      if (changed.length) await cloud.upsert('habits', changed.map((h) => ({ id: h.id, data: h, deleted: false, updated_at: now })), 'id');
      for (const id of removed) await cloud.update('habits', `id=eq.${encodeURIComponent(id)}`, { deleted: true, updated_at: now });
      const st = stateOf(w);
      if (st !== s.state) await cloud.upsert('workout_state', { ...JSON.parse(st), user_id: u, updated_at: now }, 'user_id');
      const newLogs = w.logs.filter((l) => !s.sessions.includes(l.id));
      if (newLogs.length) await cloud.upsert('workout_sessions', newLogs.map((l) => ({ id: l.id, date: l.date, title: l.title, data: l })), 'id');
      const pj = JSON.stringify(p);
      if (pj !== s.profile) await cloud.upsert('profiles', { user_id: u, name: p.name, data: p, updated_at: now }, 'user_id');
      changed.forEach((h) => { s.habits[h.id] = JSON.stringify(h); });
      removed.forEach((id) => { delete s.habits[id]; });
      s.state = st; s.profile = pj;
      s.sessions.push(...newLogs.map((l) => l.id));
      writeJSON(K.synced(u), s);
      setSync('synced');
    } catch (e) {
      if (__DEV__) console.warn('Sync push failed:', (e as Error).message);
      if ((e as Error).message === 'signed-out') { await cloud.signOut(); resetLocal(); }
      else setSync('offline');
    } finally {
      pushing.current = false;
    }
  }, [resetLocal]);

  const schedulePush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(push, 1000);
  }, [push]);

  const applyHabits = useCallback((h: Habit[]) => { cur.current.habits = h; setHabitsState(h); if (uid.current) writeJSON(K.habits(uid.current), h); }, []);
  const applyWorkout = useCallback((w: WorkoutData) => { cur.current.workout = w; setWorkoutState(w); if (uid.current) writeJSON(K.workout(uid.current), w); }, []);
  const applyProfile = useCallback((p: Profile) => { cur.current.profile = p; setProfileState(p); if (uid.current) writeJSON(K.profile(uid.current), p); }, []);

  /** Pull the user's rows. The cloud wins for anything not changed locally since the last sync. */
  const pull = useCallback(async () => {
    const u = uid.current;
    if (!u) return;
    setSync('syncing');
    try {
      const [rows, states, sessions, profiles] = await Promise.all([
        cloud.select<{ id: string; data: Habit; deleted: boolean }>('habits', 'select=id,data,deleted'),
        cloud.select<any>('workout_state', 'select=plans,active_plan_id,last_changes,sel_day,plan,prefs'),
        cloud.select<{ id: string; data: SessionLog }>('workout_sessions', 'select=id,data&order=date.asc,created_at.asc'),
        cloud.select<{ name: string; data: any }>('profiles', 'select=name,data'),
      ]);
      const s = synced.current, local = cur.current;

      // Habits: keep local edits that haven't been pushed yet.
      const dirty = new Set(local.habits.filter((h) => s.habits[h.id] !== JSON.stringify(h)).map((h) => h.id));
      const live = rows.filter((r) => !r.deleted);
      applyHabits([
        ...live.map((r) => (dirty.has(r.id) ? local.habits.find((h) => h.id === r.id)! : r.data)),
        ...local.habits.filter((h) => dirty.has(h.id) && !rows.some((r) => r.id === h.id)),
      ]);

      // Workout: plans and settings from the cloud unless changed here; logs are merged by id.
      const st = states[0];
      const cloudW = st ? migrateWorkout({ plans: st.plans, activePlanId: st.active_plan_id, lastChanges: st.last_changes, selDay: st.sel_day, plan: st.plans?.length ? null : st.plan }) : null;
      const localDirtyState = stateOf(local.workout) !== s.state;
      const extraLocal = local.workout.logs.filter((l) => !sessions.some((x) => x.id === l.id) && !s.sessions.includes(l.id));
      const w: WorkoutData = migrateWorkout({
        ...local.workout,
        ...(cloudW && !localDirtyState ? { plans: cloudW.plans, activePlanId: cloudW.activePlanId, lastChanges: cloudW.lastChanges, selDay: cloudW.selDay } : {}),
        logs: [...sessions.map((x) => x.data), ...extraLocal].sort((a, b) => a.date.localeCompare(b.date)),
      });
      applyWorkout(w);

      // Profile: cloud copy unless edited here.
      // A row with empty data (created before profiles were stored) counts as no profile, so the local one uploads.
      const pr = profiles[0] && Object.keys(profiles[0].data || {}).length ? profiles[0] : null, localDirtyProfile = JSON.stringify(local.profile) !== s.profile && s.profile !== '';
      if (pr && !localDirtyProfile) applyProfile(migrateProfile(pr.data, pr.name || cur.current.profile.name, st?.prefs));
      else if (!pr) applyProfile(migrateProfile(local.profile, local.profile.name, st?.prefs));

      synced.current = {
        habits: Object.fromEntries(live.filter((r) => !dirty.has(r.id)).map((r) => [r.id, JSON.stringify(r.data)])),
        state: cloudW && !localDirtyState ? stateOf(w) : s.state,
        sessions: sessions.map((x) => x.id),
        profile: pr && !localDirtyProfile ? JSON.stringify(cur.current.profile) : pr ? s.profile : '',
      };
      writeJSON(K.synced(u), synced.current);
      setSync('synced');
      await push();
      syncHabitReminders(cur.current.habits).catch(() => {});
    } catch (e) {
      if ((e as Error).message === 'signed-out') { await cloud.signOut(); resetLocal(); }
      else setSync('offline');
    }
  }, [applyHabits, applyWorkout, applyProfile, push, resetLocal]);

  const loadUser = useCallback(async (u: CloudUser) => {
    uid.current = u.id;
    const [h, w, p, s] = await Promise.all([
      readJSON<Habit[]>(K.habits(u.id), []), readJSON<any>(K.workout(u.id), null), readJSON<any>(K.profile(u.id), null), readJSON<Synced>(K.synced(u.id), emptySynced()),
    ]);
    synced.current = { ...emptySynced(), ...s };
    const wd = migrateWorkout(w), pd = migrateProfile(p, u.name);
    cur.current = { habits: h, workout: wd, profile: pd };
    setHabitsState(h); setWorkoutState(wd); setProfileState(pd); setUser(u);
    syncHabitReminders(h).catch(() => {});
    pull();
  }, [pull]);

  useEffect(() => {
    (async () => {
      const u = await cloud.restoreSession();
      if (u) await loadUser(u);
      setReady(true);
    })();
  }, [loadUser]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active' && uid.current) pull(); });
    return () => sub.remove();
  }, [pull]);

  const login = useCallback(async (identifier: string, password: string) => {
    let email = identifier.trim().toLowerCase(), pw = password;
    if ((email === DEMO.username || email === DEMO.email) && pw === DEMO.password) { email = DEMO.email; pw = DEMO.cloudPassword; }
    if (!email || !pw) return 'Enter your email and password';
    if (!email.includes('@')) return 'Enter the email you signed up with';
    try { await loadUser(await cloud.signIn(email, pw)); return null; } catch (e) { return (e as Error).message; }
  }, [loadUser]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (!name.trim()) return 'Enter your name';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Enter a valid email address';
    if (password.length < 8) return 'Password needs at least 8 characters';
    try {
      await loadUser(await cloud.signUp(name.trim(), email.trim().toLowerCase(), password));
      // New accounts fill in their details first (see app/onboarding).
      applyProfile({ ...cur.current.profile, onboarded: false });
      return null;
    } catch (e) { return (e as Error).message; }
  }, [loadUser, applyProfile]);

  const logout = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await push();
    await cloud.signOut();
    resetLocal();
    syncHabitReminders([]).catch(() => {});
  }, [push, resetLocal]);

  const setHabits = useCallback((fn: (h: Habit[]) => Habit[]) => { applyHabits(fn(cur.current.habits)); schedulePush(); }, [applyHabits, schedulePush]);
  const setWorkout = useCallback((fn: (w: WorkoutData) => WorkoutData) => { applyWorkout(fn(cur.current.workout)); schedulePush(); }, [applyWorkout, schedulePush]);
  const setProfile = useCallback((fn: (p: Profile) => Profile) => { applyProfile(fn(cur.current.profile)); schedulePush(); }, [applyProfile, schedulePush]);

  return (
    <Ctx.Provider value={{ ready, me: user?.id ?? null, user, profile, habits, workout, sync, login, register, logout, setProfile, setHabits, setWorkout, syncNow: pull }}>
      {children}
    </Ctx.Provider>
  );
}
