# AI Builder Cup 2026 — Submission Pack (OpsMind)

Program: **Google Cloud AI Builder Cup 2026** (Hack2skill × Google Cloud, JAPAC).
Deadline prototype submission: **18 October 2026, 23:59** (evaluation 19 Oct – 6 Nov).

Required by the official FAQ:

1. Working prototype **deployed** on Cloud Run / GCP / Firebase
2. Video demo **under 3 minutes**
3. **Public GitHub repository**
4. Deck explaining the solution

Judging: Technical Merit & Gen AI Implementation **40%** · Problem Alignment & Impact **25%** ·
Innovation & Creativity **25%** · User Experience & Solution Design **10%**.

---

## 1. Checklist

- [ ] GitHub repo public, description + topics (`nextjs`, `prisma`, `gemini`, `google-cloud`,
      `energy-efficiency`), no secrets in history (`git log -p | grep -i "AIza"` must be empty)
- [ ] Neon (or Cloud SQL) database created; schema pushed + seeded:
      `DATABASE_URL="postgres://..." npm run db:setup`
- [ ] Deployed: `gcloud run deploy opsmind --source .` (see README → Deployment)
- [ ] Deployed URL smoke-tested: Overview loads, badge `SIMULATED DATA` visible, Investigate works
- [x] `GEMINI_API_KEY` set locally: live **Gemini 3.8 Flash** (verified with `generateContent`);
      Cloud Run secret still pending. The mock remains the labelled fallback.
- [x] Demo draft recorded (< 3 min): `submission/video/OpsMind_Demo_Draft_EN.mp4` (2:39)
- [ ] Final video with voice-over against the deployed URL, uploaded (YouTube/Drive unlisted)
- [x] Deck finalised and exported to PDF: `submission/OpsMind_AI_Deck_EN.pdf` and
      `submission/OpsMind_AI_Deck_ID.pdf`
- [ ] Team formation finalised in the Hack2skill dashboard

Completed locally on 18 Oct 2026: deck + screenshots + PDF, `/api/health`, rate limits for
investigations and demo reset, optional `DEMO_RESET_TOKEN`, live Gemini 3.8 Flash, a 2:39 demo
draft (screen-only, captions), and form-ready copy in [`submission/SUBMISSION_TEXT.md`](./submission/SUBMISSION_TEXT.md).
Still missing: the public repo push, a Neon/Cloud SQL `DATABASE_URL`, the Cloud Run deployment,
and the final voice-over video.

## 1b. Demo video draft

`submission/video/` contains `OpsMind_Demo_Draft_EN.mp4` (2:39, 1600×900, H.264, captions
burned in), `OpsMind_Demo_Draft_EN.srt`, a timed voice-over script
(`OpsMind_Demo_Draft_EN.captions.md`), and a README with re-record instructions:

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
