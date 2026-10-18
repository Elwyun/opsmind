# OpsMind demo draft — caption and voice-over script

Recorded 2026-10-18 against `https://opsmind-483387477810.asia-southeast1.run.app`.
Video: `OpsMind_Demo_Draft_EN.mp4` · 3:13 long · 1600×900 · captions burned in.

Read the *Say* column aloud if you add a voice-over; keep each line inside its window.

| Time | Section | Say |
| --- | --- | --- |
| 0:00–0:08 | OpsMind — AI operational intelligence | A working prototype that turns separated operations data into evidence a manager can check. |
| 0:08–0:21 | The numbers live in separate places | Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it. |
| 0:21–0:31 | One period, three numbers | 30 labelled simulated days. Production stays flat while electricity rises; energy intensity is calculated by the app, not by the model. |
| 0:31–0:39 | The strongest candidate | 17 Sep 2026 is +36.0% above its trailing baseline. Method baseline-v1, threshold 15% — a prototype heuristic, not an industry standard. |
| 0:39–0:57 | One pipeline, no black box | Route handlers validate the request, the analysis engine computes the metrics, a context builder packages 13 evidence items, Gemini answers as JSON, and Zod validates it before it is stored. |
| 0:57–1:03 | Investigation queue | Two candidate days, each with deviation, severity, estimated impact and a one-line evidence summary. |
| 1:03–1:17 | Run the investigation | The button calls the backend. The metrics are computed first; only then is the model asked to explain them. |
| 1:17–1:27 | Evidence before explanation | Actual and baseline intensity, the comparison window and the deviation are stored with the result, so any claim can be traced back. |
| 1:27–1:33 | E1–E13, the only context the model sees | The model cannot run SQL or shell. Citations of evidence that was not supplied are discarded and counted. |
| 1:33–1:41 | A transparent cost estimate | excess kWh × tariff. The formula and its assumptions are printed; this is a potential estimate, not a bill and not a verified saving. |
| 1:41–1:49 | Live model — gemini-3.8-flash | Gemini wrote this answer from the supplied evidence only. Its output is validated server-side against a Zod schema before it is stored. |
| 1:49–1:56 | Hypotheses, not conclusions | Observations cite evidence IDs. Each possible factor lists the evidence that is still missing before it can be confirmed. |
| 1:56–2:05 | AI suggests, a person decides | Recommended checks are human inspections. No autonomous equipment control is ever proposed. |
| 2:05–2:20 | The app shows its work | Every claim cites evidence IDs, failures are stored as failures, and simulated data is labelled everywhere — the mock is never presented as live AI. |
| 2:20–2:30 | Record the human decision | The operator adds the check they intend to run, then marks it completed with a short note. |
| 2:30–2:35 | Human sign-off, then verification | Marking the action completed unlocks a before/after comparison over two explicit date windows. |
| 2:35–2:41 | Observed change, not causation | The comparison reports before and after intensity and states the caveat: other factors are not controlled, so this does not prove the action caused the change. |
| 2:41–2:49 | Every row carries its source | Rows are labelled SIMULATED. Days without enough baseline are reported as insufficient, never estimated. |
| 2:49–2:56 | Failure shown as failure | The health endpoint reports database and model state. A failed model call is stored as FAILED with an error code — no substitute answer is invented. |
| 2:56–3:13 | A working, honest prototype | Live at opsmind-483387477810.asia-southeast1.run.app today; real weather data, CSV import and authentication are next, and the evidence trail stays. |
