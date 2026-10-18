# AI Builder Cup 2026 — Submission Pack (OpsMind)

Program: **Google Cloud AI Builder Cup 2026** (Hack2skill × Google Cloud, JAPAC).
Deadline prototype submission: **18 October 2026, 23:59** (evaluation 19 Oct – 6 Nov).

Required by the official FAQ:

1. Working prototype **deployed** on Cloud Run / GCP / Firebase
2. Video demo — the FAQ says “three minutes”; the submission form asks for **3–4 minutes**, so the
   recorded cut is **3:27** and satisfies the form
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
- [x] Deployed and smoke-tested on **Vercel**: https://opsmind-one.vercel.app (Cloud Run still blocked
      on GCP billing — see §1c)
- [x] Deployed URL smoke-tested: Overview `SIMULATED DATA`, `+36.0%` queue row, live investigation
      (`COMPLETED`, 13 evidence, 3 hypotheses, `Live model`)
- [x] `GEMINI_API_KEY` set locally: live **Gemini 3.8 Flash** (verified with `generateContent`);
      Cloud Run secret still pending. The mock remains the labelled fallback.
- [x] Demo recorded + narrated: `submission/video/OpsMind_Demo_Narrated_EN.mp4` (3:27, captions burned
      in, synthetic voice fitted to the caption windows)
- [ ] Final video against the deployed URL (address bar visible), uploaded (YouTube/Drive unlisted)
- [x] Deck finalised and exported to PDF: `submission/OpsMind_AI_Deck_EN.pdf` and
      `submission/OpsMind_AI_Deck_ID.pdf`
- [ ] Team formation finalised in the Hack2skill dashboard

Completed locally on 18 Oct 2026: deck + screenshots + PDF, `/api/health`, rate limits for
investigations and demo reset, optional `DEMO_RESET_TOKEN`, live Gemini 3.8 Flash, a 3:27 narrated demo,
and form-ready copy in [`submission/SUBMISSION_TEXT.md`](./submission/SUBMISSION_TEXT.md).
Still missing: the Cloud Run deployment, the final voice-over video and the Hack2skill form.

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

**Cloud Run — blocked.** `gcloud` 589.0.0 is installed locally and authenticated as
`alwihamzah@gmail.com`, but `gcloud billing projects describe` reports
`billingEnabled: False` for every project on the account and there is no billing account.
Cloud Run, Cloud Build and Artifact Registry cannot be used until billing is enabled.

To unblock (needs your payment method):

1. Open https://console.cloud.google.com/billing/create and add a billing account
   (new accounts get free trial credits).
2. Link it to a project — `gen-lang-client-0869954467` is already named `opsmind`:
   https://console.cloud.google.com/billing/link?project=gen-lang-client-0869954467
3. Tell me when it is linked; I then run:

```bash
gcloud config set project gen-lang-client-0869954467
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud run deploy opsmind --source . --region asia-southeast1 --allow-unauthenticated
```

## 1b. Demo video draft

`submission/video/` contains the narrated cut `OpsMind_Demo_Narrated_EN.mp4` (3:27, 1600×900,
H.264 + AAC) and the silent take `OpsMind_Demo_Draft_EN.mp4`, plus the SRT, the caption table
(`OpsMind_Demo_Draft_EN.captions.md`), the timed voice-over (`VOICEOVER_EN.md` + `voiceover-en.json`)
and a README with re-record instructions:

```bash
DEMO_URL=https://YOUR-SERVICE.run.app npm run demo:record
```

The draft was recorded against a local production build with live Gemini (`Live model` in the
UI). The final take must show the deployed URL and include the voice-over; no claim in the
video depends on the local URL.

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
