# OpsMind — AI Operational Intelligence

Implementation of the OpsMind prototype described in [`opsmind-project-docs/`](./opsmind-project-docs).
It detects potential energy inefficiency by combining production, electricity, operating hours and
weather context.

**The app calculates every number deterministically. The model only explains the evidence it is
given and suggests what a person should check.**

> Status: roadmap milestones **M1–M5** are implemented, and the app now runs on **PostgreSQL**
> (local embedded instance for development, managed serverless Postgres for deployment — see
> [Deployment](#deployment-google-cloud-run)). All demo data is synthetic and labelled
> `SIMULATED DATA`. No saving has been verified.
>
> Submission artifacts live in [`submission/`](./submission/); the deployment and 3-minute demo
> checklist is in [`docs/DEPLOY_AND_DEMO.md`](./docs/DEPLOY_AND_DEMO.md).

---

## Quick start

```bash
npm install
npm run db:setup     # start the local embedded PostgreSQL, push the schema, seed 30 simulated days
npm run dev          # http://localhost:3000
```

No database to install: `scripts/with-pg.mjs` boots a private PostgreSQL (data in `.local-pg/`,
ignored by git) for `dev`, `start`, `db:*` and `demo:reset` commands, then stops it again.

Environment (`.env`, already present; see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Local default: the embedded instance on `127.0.0.1:54329`. |
| `TEST_DATABASE_URL` | Optional: run the test suite against an existing PostgreSQL instead of its own embedded instance. |
| `GEMINI_API_KEY` | **Server-side only.** Empty ⇒ the deterministic mock runs instead of Gemini. |
| `GEMINI_MODEL` | Gemini model name, default `gemini-3.8-flash`. |
| `DEMO_RESET_TOKEN` | Optional: when set, `POST /api/demo/reset` requires `x-demo-reset-token`. Recommended for a public demo. |

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `start` | Next.js 16 (Turbopack) with the local PostgreSQL started automatically. |
| `npm run build` | Production build (no database needed — all routes are dynamic). |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm test` | Vitest, 79 tests, against an isolated embedded PostgreSQL on port 54330. |
| `npm run db:setup` | Start local PostgreSQL + push schema + generate client + seed. |
| `npm run demo:reset` | Wipe and re-seed the deterministic demo data. |
| `npm run demo:record` | Record the demo draft with Playwright + ffmpeg (`DEMO_URL` defaults to `http://localhost:3000`). |

The header has a **Reset demo data** button that hits `POST /api/demo/reset`.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 7 (strict) · Prisma 7 + **PostgreSQL** (driver
adapter `@prisma/adapter-pg`) · Zod 4 · Vitest 5 · embedded PostgreSQL for local dev/tests. No UI
framework — design tokens live in `src/app/globals.css`.

**Database:** PostgreSQL as required by `docs/SCHEMA.md`, with the native column types from that
document (`@db.Date`, explicit `@db.Decimal` precisions). Locally and in tests an
[embedded-postgres](https://www.npmjs.com/package/embedded-postgres) instance is started on demand,
so `npm install && npm run db:setup` still works with zero external setup. For deployment,
`DATABASE_URL` is pointed at a managed serverless PostgreSQL (e.g. Neon) in the Cloud Run service
configuration — see [Deployment](#deployment-google-cloud-run).

---

## Layout

```
prisma/schema.prisma          Company, DailyOperationalData, Investigation, ActionItem, Verification
prisma/seed.ts                idempotent seed of the deterministic dataset
src/lib/analysis/             pure, tested engine
  energy-intensity.ts         kWh / units, refuses zero production and missing values
  baseline.ts                 trailing comparison window, excludes the tested day
  anomaly-detection.ts        deviation, threshold, severity bands
  cost-impact.ts              expected / excess kWh and cost, with formula + assumptions
  window-intensity.ts         mean intensity over a window (before/after verification)
  metrics.ts                  analyzeDay / analyzePeriod composition
src/lib/weather/              WeatherProvider interface + deterministic mock provider
src/lib/ai/                   context builder, prompt, Zod output schema, Gemini client, mock client
src/lib/services/             company, operational data, anomalies, investigations, actions, verification, demo reset
src/lib/api/                  consistent `{ data }` / `{ error }` envelopes, correlation IDs, validation helpers
src/app/api/                  companies, operational-data, anomalies, investigations[/:id], actions, verifications, demo/reset
src/app/                      Overview, Investigations, investigation detail, Actions, Data
tests/                        analysis, validation, AI, demo dataset, HTTP-level API integration
```

---

## Rules this implementation enforces

- **Deterministic, traceable numbers.** `energyIntensity = electricityKwh / productionUnits`;
  `expectedKwh = units × baselineIntensity`; `potentialExcessKwh = max(0, actual − expected)`;
  `estimatedAdditionalCost = potentialExcessKwh × tariff`. The cost panel prints the formula and its
  assumptions. `methodVersion` is stored on every investigation.
- **Zero production and missing values never become a number.** The day is reported as
  `INSUFFICIENT_DATA`, along with `Insufficient baseline data` when fewer than 5 comparison days exist.
- **The tested day is never in its own baseline.**
- **The model only sees minimum structured context** (13 evidence items, a weather reading, explicit
  limitations). It cannot run SQL or shell, and its output is validated server-side against a Zod
  schema; citations of evidence that was not supplied are discarded and counted.
- **A failing model is shown as failing.** Timeout, quota, malformed JSON and schema mismatches are
  stored as `FAILED` with an error code. No substitute answer is invented, and a failed re-run clears
  any previous stored result.
- **Simulated and live are labelled everywhere.** Data rows, the header badge, and the AI panel
  (`Simulated model` vs `Live model`). The mock client is never described as live AI.
- **AI suggests, a person decides.** Recommended checks are human inspections; autonomous equipment
  control is never suggested. Before/after comparisons carry the caveat that a change does not prove
  causation.
- **Secrets stay server-side** and are never logged; API errors return a correlation ID with only the
  error name/message logged.

---

## Demo path (3 minutes)

1. **Overview** — KPI cards and trend. Production is flat while electricity spikes.
2. **Investigation queue** — `17 Sep 2026`, +36.0% above baseline, severity *Medium*.
3. Click **Investigate** (calls the backend) → investigation detail.
4. **Anomaly summary** and **Evidence** (E1–E13) show what the claim is based on.
5. **AI summary**, **Observations**, **Possible contributing factors** (each with missing evidence),
   **Recommended checks**, and **Limitations**.
6. **Estimated impact** shows the formula: excess kWh × tariff.
7. Add an **action**, mark it *Completed*, then record a before/after comparison. The observed change
   is reported without claiming the action caused it.

---

## Tests

`npm test` runs 79 tests offline (no network, no API key):

- engine: intensity, zero production, missing values, baseline window/insufficient baseline,
  threshold boundary, severity bands, cost formulas, zero excess, determinism, window means;
- dataset: 30 days, reproducible, all `SIMULATED`, the two intended candidates, five insufficient days;
- validation: date keys, coercion, unknown enums, malformed JSON, reversed ranges;
- AI: mock output validity and citation safety, evidence sanitization, Gemini timeout/quota/HTTP/JSON
  and schema-mismatch mapping;
- API: route handlers against a real PostgreSQL database — including the full investigate → act →
  verify flow, `404`, `400`, and the demo reset.

---

## Deployment (Google Cloud Run)

The production image needs **no database at build time** (every route is dynamic) and never
contains secrets — `.dockerignore` excludes `.env`. At runtime it needs `DATABASE_URL` (a managed
PostgreSQL) and optionally `GEMINI_API_KEY`.

```bash
# 1. One-time: create a serverless PostgreSQL (e.g. Neon free tier) and copy its URL.
# 2. Push the schema + seed the demo data onto it:
DATABASE_URL="postgres://..." npm run db:setup
# 3. Deploy: enables APIs, stores DATABASE_URL/GEMINI_API_KEY as secrets and smoke-tests.
DRY_RUN=true bash scripts/deploy-cloud-run.sh   # optional preview
bash scripts/deploy-cloud-run.sh                # uses the Dockerfile in this repo
```

Full manual equivalent (secrets first), if you prefer running `gcloud` yourself:

```bash
printf '%s' "postgres://..." | gcloud secrets create database-url --data-file=-
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
gcloud run deploy opsmind --source . \
  --region asia-southeast1 \
  --set-env-vars GEMINI_MODEL=gemini-3.8-flash \
  --set-secrets "DATABASE_URL=database-url:latest,GEMINI_API_KEY=gemini-api-key:latest"
```

Cloud Run requires billing to be enabled on the project; the script detects that and prints the
link instead of failing mid-deploy.

Leave `GEMINI_API_KEY` unset to run the deployed demo with the deterministic mock investigator —
it is labelled "Simulated model" in the UI and never presented as live AI.

For a public demo, also set `DEMO_RESET_TOKEN` (preferably via Secret Manager). The reset button
prompts for it, and `POST /api/demo/reset` rejects requests without the matching header. The AI and
reset endpoints are rate-limited per Cloud Run instance; put a shared limit at the gateway if the
service scales beyond one instance.

Smoke-test a deployment without triggering an investigation:

```bash
curl -fsS https://YOUR-SERVICE.run.app/api/health
# {"data":{"status":"ok","database":"ok","ai":{"provider":"gemini","isLive":true,...}}}
```

---

## Open items (deliberately not decided here)

1. Real weather provider — coverage, terms, rate limits and attribution must be checked first
   (`docs/ROADMAP.md` M3). `getWeatherProvider()` is the single swap point.
2. Authentication — no login exists, so no authorization checks are performed. Access control must be
   added server-side before any multi-user deployment.
3. CSV upload and date filtering are partly present (the Data page filters by date); upload validation
   is not implemented.
4. Cloud Run deployment rehearsal and 3-minute demo recording (M6).
