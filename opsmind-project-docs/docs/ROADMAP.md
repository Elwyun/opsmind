# Roadmap — OpsMind

## M0: Prototype walkthrough
- Open the HTML prototype.
- Verify the main demo path.
- Record UI issues and keep an offline fallback.

## M1: Data foundation
- Inspect repository and package versions.
- Choose database provider.
- Add Company and DailyOperationalData.
- Create deterministic 30-day seed.
- Add filtered read-only API and tests.
Exit: 30 records load and are visibly marked simulated.

## M2: Analysis engine
- Energy intensity function.
- Baseline and configurable threshold.
- Cost estimate with explicit assumptions.
- Tests for zero production, missing values, insufficient baseline.
Exit: identical input produces identical metrics and every alert exposes evidence.

## M3: Weather context
- Start with mock provider.
- Choose real provider after checking coverage, terms, limits, attribution.
- Store source/timestamp and missing-data state.
Exit: simulated and live weather are distinguishable.

## M4: Gemini investigation
- Backend-only Gemini call.
- Minimum structured context.
- Validate JSON output.
- Handle timeout, quota, malformed output.
- Store model/prompt version.
Exit: investigation shows facts, hypotheses, recommended checks, limitations.

## M5: Action and verification
- Create/complete action item.
- Capture completion note.
- Compare before/after intensity for defined windows.
Exit: display observed change without automatically asserting causation.

## M6: Demo and deployment
- Rehearse 3-minute demo.
- Add reset demo path.
- Check secrets and logs.
- Deploy to Cloud Run if credentials/time allow.
- Test deployed URL and fallback.

## Team split
Builder/product lead: data model, analysis engine, API, Gemini, deployment.
QA teammate: acceptance checklist, edge cases, UX walkthrough, evidence verification, demo timing.
Both team members review AI-generated code.
