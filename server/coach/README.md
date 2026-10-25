# Kaizen Coach function

Every AI call (coach chat, insights, workout plans, exercise help and screenshot resources) goes through this Neon Function. The Groq key stays on the server. Signed-in Kaizen users authenticate with a Neon Auth JWT; message limits and per-user rate limits remain enabled.

- Project: Kaizen (`jolly-field-54618531`), branch `main` (`br-young-salad-a1ehycin`)
- URL: https://br-young-salad-a1ehycin-coach.compute.c-1.ap-southeast-1.aws.neon.tech/

## Models

Text defaults to `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as a fallback for transient failures. Override with `GROQ_MODELS` (comma-separated, up to three model IDs).

Screenshot reading uses `qwen/qwen3.8-27b` (`GROQ_VISION_MODEL` overrides it). This is a Groq preview model; monitor availability before relying on it for production. Its three-image limit is handled by splitting Kaizen's six screenshots into batches and merging the results. Images are forwarded to Groq and are not stored by this function. Provider retention settings are managed separately in Groq's Data Controls.

## Redeploy

1. Store `GROQ_API_KEY` in the gitignored root `.env` or your secret manager. Never use an `EXPO_PUBLIC_` variable for it.
2. Run `npm ci && npm run build` in `server/coach`.
3. Deploy `function.zip` to the existing `coach` function with `GROQ_API_KEY` in the deployment environment. Neon injects the existing Auth URLs automatically.
4. Verify JSON, streamed text, screenshot extraction and rejection of unauthenticated requests before considering deployment complete.

Rotate the key in Groq and redeploy the environment when it changes. The app keeps the same coach endpoint, so changing the AI provider does not require a new APK.
