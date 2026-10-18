# Hack2skill form — field-by-field values (OpsMind / ABB Catalyst)

## Prototype Link Deployed on GCP or Cloud run

```
https://opsmind-483387477810.asia-southeast1.run.app
```

Deployed on **Google Cloud Run** (project `automationtele`, region `asia-southeast1`, revision
`opsmind-00001-hxt`, image built from source via Cloud Build, `--allow-unauthenticated`).
Database is managed PostgreSQL (Neon) and the model is live Gemini 3.8 Flash. Verified from the
deployed URL on 19 Oct 2026:

```
GET  /api/health  → {"status":"ok","database":"ok","ai":{"provider":"gemini","isLive":true,"modelName":"gemini-3.8-flash"}}
GET  /            → 200, SIMULATED DATA badge, "17 Sep 2026" queue row
POST /api/investigations {date: 2026-09-17} → 201 COMPLETED, deviation 36, severity MEDIUM
GET  /investigations/<id> → 200, "Live model", E13, Hypotheses, Recommended checks, Limitations
```

Secrets are read from Secret Manager (`database-url`, `gemini-api-key`), not revision env vars.
Redeploy with:

```bash
PROJECT_ID=automationtele bash scripts/deploy-cloud-run.sh
```

A Vercel mirror of the same build stays up at https://opsmind-one.vercel.app if the Cloud Run link
ever misbehaves during judging.

## Final Prototype PPT/Deck converted into PDF

Upload **`submission/OpsMind_AI_Deck_EN.pdf`** (1.2 MB, limit 5 MB).
Indonesian version if the judges prefer it: `submission/OpsMind_AI_Deck_ID.pdf` (also 1.2 MB).

## GitHub Repository Link (Public Access)

```
https://github.com/Elwyun/opsmind
```

## Demo Video Link

```
https://drive.google.com/file/d/1MbWaVnI91_w6GK38qvh7ldsoKX-j5wls/view
```

Uploaded 19 Oct 2026 to Google Drive (`alwihamzah@gmail.com`), shared as **anyone with the link →
reader**. Verified: unauthenticated download returns HTTP 200, and the stored md5
`f54e5a30cedb8d345d215abbdb45ca10` matches the local copy.

The file is **`submission/video/OpsMind_Demo_Narrated_EN.mp4`** — **3:13**, 1600×900, captions burned
in, with narration, recorded against the Cloud Run URL. It is inside the 3–4 minute range this field
asks for.

## Brief Description of Your Solution

Character count is printed by the block below (limit 1,024):

<!-- description-start -->
OpsMind is an AI operational intelligence prototype for SME manufacturers. It finds energy waste that production data alone cannot explain: code calculates energy intensity (kWh per unit), a seven-day trailing baseline, the deviation and a cost estimate; Gemini then explains only that evidence.

Google services: Gemini 3.8 Flash via the Gemini API, called server-side with the key in the x-goog-api-key header, never in the browser. Context is minimal: 13 evidence items, units, method version, limitations. Output is JSON, validated server-side with Zod; citations of unsupplied evidence are discarded. Timeouts, quota and schema errors are stored as FAILED with an error code, never replaced by an invented answer. A Dockerfile deploys to Cloud Run; config comes from env vars and Secret Manager, never from the image. Data is a deterministic simulated dataset, labelled everywhere; the AI suggests checks, a person decides. Live on Cloud Run: https://opsmind-483387477810.asia-southeast1.run.app
<!-- description-end -->

## Challenges (dropdown)

The list is shown only in the browser — tell me the options and I will pick the matching track
(main AI Builder Cup track vs. a Google Cloud partner challenge).
