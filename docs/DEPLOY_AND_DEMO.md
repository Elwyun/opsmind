# Deploy to Cloud Run and record the 3-minute demo

This guide is the operational checklist for the submission. It assumes the repository is already
public and the demo database is managed PostgreSQL (Neon, Cloud SQL, or equivalent).

## 1. Prerequisites

- `gcloud` CLI authenticated against the project that owns the Cloud Run service.
- A managed PostgreSQL URL with SSL enabled.
- A Gemini API key (live investigation), or an explicit decision to use the labelled mock.
- A demo reset token (recommended for a public URL).

```bash
export PROJECT_ID="your-project"
export REGION="asia-southeast1"
export SERVICE="opsmind"
export DATABASE_URL="postgres://user:password@host/db?sslmode=require"
```

## 2. Prepare the managed database

`scripts/with-pg.mjs` only starts an embedded database for localhost URLs. A remote URL is used
as-is, so the same command pushes the schema and seeds the deterministic 30-day demo:

```bash
DATABASE_URL="$DATABASE_URL" npm run db:setup
```

Verify the seed did not fail before deploying. The demo rows must be labelled `SIMULATED`.

## 3. One command (recommended)

`scripts/deploy-cloud-run.sh` performs steps 3–5: it checks billing, enables the APIs, writes
`database-url`, `gemini-api-key` and (when set) `demo-reset-token` to Secret Manager, grants the
runtime service account access, deploys from source, and polls `/api/health` until the database
reports `ok`. Values come from the environment or `.env` and are never printed.

```bash
DRY_RUN=true bash scripts/deploy-cloud-run.sh   # print every step, change nothing
bash scripts/deploy-cloud-run.sh                # deploy
```

Overrides: `PROJECT_ID`, `REGION`, `SERVICE`, `SEED=true` (push the schema and reseed first).
The script stops with the billing console link when billing is disabled; `SKIP_BILLING_CHECK=true`
only makes sense together with `DRY_RUN=true`.

## 3b. Manual path: secrets

```bash
printf '%s' "$DATABASE_URL"     | gcloud secrets create database-url     --data-file=-
printf '%s' "$GEMINI_API_KEY"   | gcloud secrets create gemini-api-key   --data-file=-
printf '%s' "$DEMO_RESET_TOKEN" | gcloud secrets create demo-reset-token --data-file=-

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
for SECRET in database-url gemini-api-key demo-reset-token; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

Skip `gemini-api-key` only if you deliberately want the labelled mock investigator. The UI will
show `Simulated model`; never present it as live AI. The connection string goes to Secret Manager
too, so the database password is not readable as a plain revision environment variable.

## 4. Deploy

```bash
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_MODEL=gemini-3.8-flash" \
  --set-secrets "DATABASE_URL=database-url:latest,GEMINI_API_KEY=gemini-api-key:latest,DEMO_RESET_TOKEN=demo-reset-token:latest"
```

The Docker image listens on `PORT=8080`; Cloud Run supplies that variable. Every route is dynamic,
so the image build needs no database connection and no secret.

## 5. Smoke test the deployed URL

```bash
export URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
curl -fsS "$URL/api/health"
```

Expected shape:

```json
{"data":{"status":"ok","database":"ok","ai":{"provider":"gemini","isLive":true,"modelName":"gemini-3.8-flash"}}}
```

If `provider` is `mock` and `isLive` is `false`, the Gemini secret is not reaching the service.
That is still a working, honestly labelled demo — but it is not a live-Gemini submission.

Then open `$URL` and check:

1. The header shows `SIMULATED DATA` and the 1–30 Sep 2026 period.
2. The investigation queue contains 17 Sep 2026 at about `+36.0%` (severity Medium).
3. **Investigate** opens a detail page with evidence E1–E13 and an AI panel.
4. The panel says `Live model` (Gemini) or `Simulated model` (mock) — never “live” for the mock.
5. Add an action, mark it completed, and record a before/after comparison; the caveat is visible.
6. Reset works with the token; repeated resets return `429 RATE_LIMITED`.

## 5b. If billing is not enabled

Cloud Run and Cloud Build refuse to run until a billing account is linked, even inside the free
tier. The script prints the exact links; for reference:

1. Create a billing account: https://console.cloud.google.com/billing/create
2. Link the project: https://console.cloud.google.com/billing/link?project=YOUR_PROJECT_ID
3. Confirm: `gcloud billing projects describe YOUR_PROJECT_ID --format='value(billingEnabled)'`

Without Cloud Run, the recorded demo can point at another host (see `SUBMISSION.md` §1c), but the
submission form requires a GCP/Cloud Run link.

## 6. Logs and rollback

```bash
gcloud run services logs read "$SERVICE" --region "$REGION" --limit 100
gcloud run revisions list --service "$SERVICE" --region "$REGION"
gcloud run services update-traffic "$SERVICE" --region "$REGION" --to-revisions REVISION=100
```

## 7. Three-minute video shot list

Record at 1440p or higher, browser zoom ≥ 110%, no secrets or terminal env values on screen.
Use one screen recording and keep the deployed URL visible in the address bar.

| Time | Screen / action | Say |
| --- | --- | --- |
| 0:00–0:15 | Title or problem slide | “Operations data is split; a power spike does not obviously track production.” |
| 0:15–0:35 | Deployed Overview | “Production is flat while electricity rises. Every number is computed by the app from 30 labelled simulated days.” |
| 0:35–0:55 | Investigation queue, 17 Sep row | “One candidate: 17 September, +36.0% above the trailing baseline. The threshold is a prototype heuristic.” |
| 0:55–1:25 | Click **Investigate**; evidence panel | “The backend computed these metrics. The model sees only this evidence — E1 to E13 — and cannot run SQL or shell.” |
| 1:25–1:50 | AI summary, hypotheses, missing evidence | “Facts and hypotheses are separated. Each hypothesis lists the evidence that is still missing.” |
| 1:50–2:10 | Estimated impact panel | “The formula is excess kWh × tariff. This is a potential estimate, not a bill and not a verified saving.” |
| 2:10–2:35 | Add action → mark completed → before/after | “A person decides what to do. The comparison reports an observed change without claiming the action caused it.” |
| 2:35–2:50 | Health check or mock/live label | “If Gemini fails, the investigation is shown as failed. With no key, the mock is labelled Simulated model.” |
| 2:50–3:00 | Roadmap / closing | “Next: real weather, CSV import, authentication and controlled before/after studies.” |

Before recording:

```bash
npm run demo:reset
# or, against the deployed URL:
curl -fsS -X POST -H "x-demo-reset-token: $DEMO_RESET_TOKEN" "$URL/api/demo/reset"
```

Do not run the reset during the take unless the shot list calls for it. After recording, confirm the
video is under 3:00 and the deployed URL still answers `/api/health`.
