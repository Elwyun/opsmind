# Hack2skill form — field-by-field values (OpsMind / ABB Catalyst)

## Prototype Link Deployed on GCP or Cloud run

- Live prototype: `[PENDING — Vercel URL until Cloud Run billing is enabled]`
- Cloud Run target (when billing is enabled): `gcloud run deploy opsmind --source . --region asia-southeast1`

## Final Prototype PPT/Deck converted into PDF

Upload **`submission/OpsMind_AI_Deck_EN.pdf`** (1.2 MB, limit 5 MB).
Indonesian version if the judges prefer it: `submission/OpsMind_AI_Deck_ID.pdf` (also 1.2 MB).

## GitHub Repository Link (Public Access)

```
https://github.com/Elwyun/opsmind
```

## Demo Video Link

`[PENDING — upload OpsMind_Demo_Narrated_EN.mp4 as unlisted YouTube/Drive]`

Upload **`submission/video/OpsMind_Demo_Narrated_EN.mp4`** — **3:27**, 1600×900, captions burned in,
with narration. It is inside the 3–4 minute range this field asks for.

## Brief Description of Your Solution

Character count is printed by the block below (limit 1,024):

<!-- description-start -->
OpsMind is an AI operational intelligence prototype for SME manufacturers. It finds energy waste that production data alone cannot explain: code calculates energy intensity (kWh per unit), a seven-day trailing baseline, the deviation and a cost estimate; Gemini then explains only that evidence.

Google services: Gemini 3.8 Flash via the Gemini API, called server-side with the key in the x-goog-api-key header, never in the browser. Context is minimal: 13 evidence items, units, method version, limitations. Output is JSON, validated server-side with Zod; citations of unsupplied evidence are discarded. Timeouts, quota and schema errors are stored as FAILED with an error code, never replaced by an invented answer. A Dockerfile targets Cloud Run; configuration comes from environment variables or Secret Manager, so no secret is baked into the image. Data is a deterministic simulated dataset, labelled everywhere; the AI suggests checks, a person decides.
<!-- description-end -->

## Challenges (dropdown)

The list is shown only in the browser — tell me the options and I will pick the matching track
(main AI Builder Cup track vs. a Google Cloud partner challenge).
