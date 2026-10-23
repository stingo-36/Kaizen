# Kaizen

A personal life app (Expo, Android first): habits, workouts, food, health from Health Connect, spending from
SpendWise, the WorkNest Tracker (to-dos, follow-ups, notes, saved resources) and an AI coach.

## Run it

```bash
npm install
npx expo start --web --port 8082   # web preview
```

Phones run the installed APK and get updates over the air.

```bash
npm run publish:phone                                                   # over-the-air update (JavaScript only)
npx eas-cli@latest build --platform android --profile preview            # new APK (needed after native changes)
```

Run `npx tsc --noEmit` and `npx expo lint` before publishing.

## Where things live

- `src/app/`: screens (Expo Router). `(tabs)/` is the bottom bar, `tracker/` the Tracker section pages, `share.tsx`
  the screen that opens when a reel or screenshots are shared to Kaizen.
- `src/components/`: shared UI (`ui.tsx`), Tracker pieces (`tracker/`), icons (`ico.tsx`).
- `src/lib/`: data and API clients: Neon auth and data (`cloud.ts`), WorkNest (`worknest.ts`), SpendWise
  (`spend.ts`), AI (`ai.ts`).
- `server/coach/`: the Neon Function that makes every AI call, so no AI key ships in the app. See its README.
- `scripts/sync-foods.mjs`: monthly food database sync (`npm run foods:sync`).

## Environment

`.env` holds `OPENROUTER_KEY` (server only, deployed into the coach function). `.env.local` holds the SpendWise
and WorkNest Vercel bypass keys and `DATABASE_URL` for scripts. Both are gitignored; the bypass keys are also set
on EAS for builds.
