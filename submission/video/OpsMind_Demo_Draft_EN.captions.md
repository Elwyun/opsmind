# OpsMind demo draft — caption and voice-over script

Recorded 2026-10-18 against `https://opsmind-one.vercel.app`.
Video: `OpsMind_Demo_Draft_EN.mp4` · 3:40 long · 1600×900 · captions burned in.

Read the *Say* column aloud if you add a voice-over; keep each line inside its window.

| Time | Section | Say |
| --- | --- | --- |
| 0:00–0:08 | OpsMind — AI operational intelligence | A working prototype that turns separated operations data into evidence a manager can check. |
| 0:08–0:22 | The numbers live in separate places | Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it. |
| 0:22–0:32 | One period, three numbers | 30 labelled simulated days. Production stays flat while electricity rises; energy intensity is calculated by the app, not by the model. |
| 0:32–0:39 | The strongest candidate | 17 Sep 2026 is +36.0% above its trailing baseline. Method baseline-v1, threshold 15% — a prototype heuristic, not an industry standard. |
| 0:39–1:01 | One pipeline, no black box | Route handlers validate the request, the analysis engine computes the metrics, a context builder packages 13 evidence items, Gemini answers as JSON, and Zod validates it before it is stored. |
| 1:01–1:07 | Investigation queue | Two candidate days, each with deviation, severity, estimated impact and a one-line evidence summary. |
| 1:07–1:26 | Run the investigation | The button calls the backend. The metrics are computed first; only then is the model asked to explain them. |
| 1:26–1:36 | Evidence before explanation | Actual and baseline intensity, the comparison window and the deviation are stored with the result, so any claim can be traced back. |
| 1:36–1:42 | E1–E13, the only context the model sees | The model cannot run SQL or shell. Citations of evidence that was not supplied are discarded and counted. |
| 1:42–1:50 | A transparent cost estimate | excess kWh × tariff. The formula and its assumptions are printed; this is a potential estimate, not a bill and not a verified saving. |
| 1:50–1:58 | Live model — gemini-3.8-flash | Gemini wrote this answer from the supplied evidence only. Its output is validated server-side against a Zod schema before it is stored. |
| 1:58–2:05 | Hypotheses, not conclusions | Observations cite evidence IDs. Each possible factor lists the evidence that is still missing before it can be confirmed. |
| 2:05–2:14 | AI suggests, a person decides | Recommended checks are human inspections. No autonomous equipment control is ever proposed. |
| 2:14–2:33 | The app shows its work | Every claim cites evidence IDs, failures are stored as failures, and simulated data is labelled everywhere — the mock is never presented as live AI. |
| 2:33–2:50 | Record the human decision | The operator adds the check they intend to run, then marks it completed with a short note. |
| 2:50–2:58 | Human sign-off, then verification | Marking the action completed unlocks a before/after comparison over two explicit date windows. |
| 2:58–3:05 | Observed change, not causation | The comparison reports before and after intensity and states the caveat: other factors are not controlled, so this does not prove the action caused the change. |
| 3:05–3:15 | Every row carries its source | Rows are labelled SIMULATED. Days without enough baseline are reported as insufficient, never estimated. |
| 3:15–3:22 | Failure shown as failure | The health endpoint reports database and model state. A failed model call is stored as FAILED with an error code — no substitute answer is invented. |
| 3:22–3:40 | A working, honest prototype | Live at opsmind-one.vercel.app today; real weather data, CSV import and authentication are next, and the evidence trail stays. |
