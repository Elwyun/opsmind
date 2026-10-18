# AI Builder Cup 2026 — Submission Pack (OpsMind)

Program: **Google Cloud AI Builder Cup 2026** (Hack2skill × Google Cloud, JAPAC).
Deadline prototype submission: **18 October 2026, 23:59** (evaluation 19 Oct – 6 Nov).

Required by the official FAQ:

1. Working prototype **deployed** on Cloud Run / GCP / Firebase
2. Video demo — the FAQ says “three minutes”; the submission form asks for **3–4 minutes**, so the
   recorded cut is **3:13** and satisfies the form
3. **Public GitHub repository**
4. Deck explaining the solution

Judging: Technical Merit & Gen AI Implementation **40%** · Problem Alignment & Impact **25%** ·
Innovation & Creativity **25%** · User Experience & Solution Design **10%**.

---

## 1. Checklist

- [x] GitHub repo public: https://github.com/Elwyun/opsmind (`main`), no secrets in history
- [ ] Repo description + topics (`nextjs`, `prisma`, `gemini`, `google-cloud`, `energy-efficiency`)
- [x] Neon database created and seeded: project `morning-lake-93206231` (opsmind, `aws-ap-southeast-1`),
      30 simulated days, `.env` uses the pooled URL (see §1c)
- [x] Deployed and smoke-tested on **Cloud Run**: https://opsmind-483387477810.asia-southeast1.run.app
      (Vercel mirror: https://opsmind-one.vercel.app — see §1c)
- [x] Deployed URL smoke-tested on Cloud Run: Overview `SIMULATED DATA`, `17 Sep 2026` queue row,
      live investigation (`COMPLETED`, deviation 36, severity MEDIUM, `Live model`, E13), no `FAILED`
- [x] `GEMINI_API_KEY` set locally and as the Cloud Run secret `gemini-api-key`; live **Gemini 3.8
      Flash** on both deployments. The mock remains the labelled fallback.
- [x] Demo recorded + narrated **against the Cloud Run URL**:
      `submission/video/OpsMind_Demo_Narrated_EN.mp4` (3:13, captions burned in, synthetic voice)
- [x] Demo video uploaded to Google Drive (`alwihamzah@gmail.com`), shared anyone-with-the-link →
      reader: https://drive.google.com/file/d/1MbWaVnI91_w6GK38qvh7ldsoKX-j5wls/view
- [ ] Final video re-recorded against the Cloud Run URL (address bar visible) once billing is linked
- [x] Deck finalised and exported to PDF: `submission/OpsMind_AI_Deck_EN.pdf` and
      `submission/OpsMind_AI_Deck_ID.pdf`
- [ ] Team formation finalised in the Hack2skill dashboard

Completed on 18–19 Oct 2026: deck + screenshots + PDF, `/api/health`, rate limits for investigations
and demo reset, optional `DEMO_RESET_TOKEN`, live Gemini 3.8 Flash, a 3:13 narrated demo, form-ready
copy in [`submission/SUBMISSION_TEXT.md`](./submission/SUBMISSION_TEXT.md), and the **Cloud Run
deployment** (see §1c).

Still missing for the submit button: upload the deck PDF, paste the prototype/video links and the
1,024-character description into the Hack2skill form, and finalise the team roster in the dashboard.
Optional polish: re-record the demo so the on-screen URL matches the Cloud Run link, and add repo
topics + description.

## 1c. Infrastructure status (18 Oct 2026)

**Neon — done.** Project `morning-lake-93206231` (`opsmind`) in `aws-ap-southeast-1`, branch
`main`, linked via `.neon` (git-ignored). The schema was pushed and the 30-day demo seeded over
the direct connection; `.env` holds the **pooled** URL for application traffic. Verified
end-to-end against Neon: `GET /api/health` → `database: ok`, and
`POST /api/investigations` for 2026-09-17 → `COMPLETED`, deviation 36%, live Gemini
(`gemini-3.8-flash`), 13 evidence items, 3 hypotheses.

To re-seed or re-link:

```bash
npx neonctl link --project-id morning-lake-93206231 --org-id org-round-frost-91581060 --no-env-pull -y
DATABASE_URL="$DIRECT_NEON_URL" npm run db:setup
```

**Vercel — live.** Project `alwihamzah-9399/opsmind` → https://opsmind-one.vercel.app
(`opsmind-cued1i3re-alwihamzah-9399.vercel.app` is the deployment URL behind the alias).
`vercel.json` runs `prisma generate && next build`. Production env vars: `DATABASE_URL` (Neon
pooled), `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`; `DEMO_RESET_TOKEN` is intentionally
unset for the local demo. Verified from the deployed URL:

```
GET  /api/health   → {"status":"ok","database":"ok","ai":{"provider":"gemini","isLive":true,"modelName":"gemini-3.8-flash"}}
GET  /             → SIMULATED DATA, +36.0%, 17 Sep 2026
POST /api/investigations {companyId, date: 2026-09-17}
                   → COMPLETED, severity MEDIUM, deviation 36, 13 evidence, 3 hypotheses, isLive true
GET  /investigations/<id> → Anomaly summary, Evidence, AI summary, Live model, Limitations
```

Redeploy with `vercel --prod`, or connect Git with `vercel git connect` for auto-deploys.

**Cloud Run — live.** https://opsmind-483387477810.asia-southeast1.run.app
Deployed 19 Oct 2026 from source with `PROJECT_ID=automationtele bash scripts/deploy-cloud-run.sh`,
using the `sisawaktu11@gmail.com` account (the `alwihamzah` account has no billing account, which is
what blocked this earlier). Project `automationtele`, region `asia-southeast1`, revision
`opsmind-00001-hxt`, service account `483387477810-compute@developer.gserviceaccount.com`.
Secrets live in Secret Manager (`database-url`, `gemini-api-key`); the image is built by Cloud Build
from the repo `Dockerfile`. Verified from the deployed URL:

```
GET  /api/health → {"status":"ok","database":"ok","ai":{"provider":"gemini","isLive":true,"modelName":"gemini-3.8-flash"}}
GET  /           → 200, SIMULATED DATA, 17 Sep 2026
POST /api/investigations {date: 2026-09-17} → 201 COMPLETED, deviation 36, severity MEDIUM
GET  /investigations/cmve3kc9n001r08kt79rlbfft → 200, Live model, E13, Hypotheses, no FAILED
```

The first attempt failed with `PERMISSION_DENIED: ... default service account is missing required
IAM permissions`; granting `roles/cloudbuild.builds.builder`, `roles/storage.objectViewer`,
`roles/artifactregistry.writer` and `roles/logging.logWriter` to that service account fixed it.

**Cloud Run — previously blocked (context).** `gcloud` is authenticated as `alwihamzah@gmail.com`,
but `gcloud billing projects describe` reports `billingEnabled: False` for every project on the
account and there is no billing account there. The `sisawaktu11@gmail.com` account does have one
(`01AD94-98B6CE-A6E98D`, IDR), with `automationtele` and `gen-lang-client-0307206048` linked.

Redeploying is one command (already proven end-to-end):

```bash
PROJECT_ID=automationtele bash scripts/deploy-cloud-run.sh
```

Use it after any code change, and use `DRY_RUN=true` to preview without changing anything.
If it ever fails again with `default service account is missing required IAM permissions`, re-apply
the four role bindings listed above. The `gen-lang-client-0869954467` project (the `alwihamzah`
account) is *not* used for this submission because that account has no billing account.

It enables the four APIs, writes `database-url` / `gemini-api-key` (and `demo-reset-token` when
`DEMO_RESET_TOKEN` is set) to Secret Manager, grants the runtime account access, deploys `opsmind`
to `asia-southeast1` from source, then polls `/api/health` until `database: ok` and reports whether
the model is live. Without billing it stops at preflight with the link above and exit code 2.
The manual `gcloud` equivalent is in [`docs/DEPLOY_AND_DEMO.md`](./docs/DEPLOY_AND_DEMO.md) §3–§5.

## 1b. Demo video

`submission/video/` contains the narrated cut `OpsMind_Demo_Narrated_EN.mp4` (3:13, 1600×900,
H.264 + AAC) and the silent take `OpsMind_Demo_Draft_EN.mp4`, plus the SRT, the caption table
(`OpsMind_Demo_Draft_EN.captions.md`), the timed voice-over (`VOICEOVER_EN.md` + `voiceover-en.json`)
and a README with re-record instructions:

```bash
DEMO_URL=https://YOUR-SERVICE.run.app npm run demo:record
```

The take was recorded against the deployed **Cloud Run** URL with live Gemini (`Live model` in the
UI), and that URL is printed on the title and closing cards. There is still no browser chrome
in the frame (Playwright captures the viewport only) and the voice is synthetic.

Uploaded 19 Oct 2026 to Google Drive under `alwihamzah@gmail.com`, shared **anyone with the link →
reader** (verified: unauthenticated download returns HTTP 200). The content was replaced in place
with the Cloud Run re-record (including a corrected closing narration line), so the link below is
unchanged; stored md5 `8c851a198806d57c8d05df28793036ed` matches the local file byte-for-byte:

```
https://drive.google.com/file/d/1MbWaVnI91_w6GK38qvh7ldsoKX-j5wls/view
```

This is the link to paste into the form field *Demo Video Link (3–4 minutes)*.

## 2. Video shot list (3 minutes, single screen recording, voice-over optional)

Mirrors `opsmind-project-docs/docs/DESIGN.md` → *Demo 3 menit*.

| Time | Shot | Say |
| --- | --- | --- |
| 0:00–0:20 | Problem: two spreadsheets / separated numbers | Operations data is split; a power spike does not obviously track production. |
| 0:20–0:45 | Overview page: KPI cards, trend chart, badge | Production is flat while electricity jumps — all numbers are computed by code from 30 labelled simulated days. |
| 0:45–1:10 | Investigation queue → click **Investigate** | One candidate: 17 Sep, +36.0% above the rolling baseline (method baseline-v1, threshold 15%). |
| 1:10–1:45 | Investigation detail: Evidence E1–E13, Gemini panel | Facts vs hypotheses are separated: observations cite evidence IDs, each hypothesis lists missing evidence, and limitations are explicit. |
| 1:45–2:10 | Cost estimate panel | Show the formula: excess kWh × tariff — an estimate, not a claimed saving. |
| 2:10–2:40 | Add action → Completed → before/after comparison | A human decides; the observed change is reported without claiming causation. |
| 2:40–3:00 | Failed-AI / insufficient-data states, deployed URL | Honest failure states; deterministic mock labelled “Simulated model” when no key is set. |

Recording rules: no secrets on screen, browser zoom ≥ 110%, one take per section is fine.

## 3. Deck outline (10 slides)

1. **Title** — OpsMind, AI Operational Intelligence, team, JAPAC.
2. **Problem** — separated operations data; managers compare periods by hand (PRD §2).
3. **Solution** — deterministic metrics + Gemini explains evidence and suggests checks.
4. **Live demo** — screenshot grid of the 7-step journey (embed the video link).
5. **Architecture** — Next.js → Route Handlers → Validation → Prisma/Postgres → Analysis Engine →
   Context Builder → Gemini → Zod validation → UI (from `docs/ARCHITECTURE.md`).
6. **Trust by design** — every number traceable to record + formula; AI output validated server-side;
   failures shown as failures; simulated data labelled (addresses *Technical Merit*).
7. **Gen AI implementation** — minimum structured context, evidence IDs, qualitative confidence,
   prompt + model versioning, mock/live switch (addresses the 40% criterion directly).
8. **Impact** — energy intensity as an early-warning metric for SME manufacturers; estimates with
   stated assumptions, no unverified savings claims (25% Problem Alignment).
9. **Innovation** — “what's the evidence?” as the core UX; weather-correlation-is-not-causation
   guardrails; before/after verification without automatic causation (25% Innovation).
10. **Roadmap + ask** — real weather provider, auth, CSV import, multi-site.

## 4. Eligibility guardrails

- Fresh project only: work started during the hackathon window (repo history starts 10 Oct 2026).
- Google Cloud stack: deployed on **Cloud Run** with a managed PostgreSQL; Gemini for the AI panel.
- Team: 2–4 members, all 21+, all based in JAPAC, no students.
- One submission per team.
