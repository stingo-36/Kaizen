# Kaizen Coach function

Every AI call in the app (coach chat, daily tip, weekly insight, workout plans, exercise help, and turning a shared
reel plus screenshots into a WorkNest resource) goes through this Neon Function, so the OpenRouter key stays on the server. It accepts only signed-in Kaizen users (Neon Auth JWT),
caps message size, and limits each user to 40 calls per 10 minutes.

- Project: Kaizen (`jolly-field-54618531`), branch `main` (`br-young-salad-a1ehycin`)
- URL: https://br-young-salad-a1ehycin-coach.compute.c-1.ap-southeast-1.aws.neon.tech/

## Models

Set in `index.ts` (or the `OPENROUTER_MODELS` env var, comma-separated, at most 3). The first is the paid
`minimax/minimax-m3.1-flash`; while the OpenRouter account has no credit, OpenRouter skips it and uses the free ones.

Screenshots for resources use the image-reading models in `VISION_MODELS` (or `OPENROUTER_VISION_MODELS`). They are
passed to the model and dropped; the function stores nothing.

## Redeploy

```bash
cd server/coach && npm install && npm run build && cd ../..
neon functions deploy coach --src server/coach/dist/index.mjs --no-bundle \
  --env "OPENROUTER_KEY=$(grep '^OPENROUTER_KEY=' .env | cut -d= -f2-)" \
  --project-id jolly-field-54618531 --branch br-young-salad-a1ehycin
```

After rotating the OpenRouter key, put the new one in `.env` as `OPENROUTER_KEY` and run the deploy line again.
