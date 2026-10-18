# OpsMind demo — voice-over script

Voice used for this cut: **Microsoft Zira Desktop** (Windows speech engine).
Video: `OpsMind_Demo_Narrated_EN.mp4` · 3:13 · captions burned in, narrated.

Re-record with a human voice by reading the *Line* column inside its window. Timing comes from
the recording's SRT; lines come from `voiceover-en.json`, keyed by the caption title.

| Window | Section | Line |
| --- | --- | --- |
| 0:00–0:08 | OpsMind — AI operational intelligence | OpsMind turns separated operations data into evidence a manager can check. |
| 0:08–0:21 | The numbers live in separate places | Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it. |
| 0:21–0:31 | One period, three numbers | Thirty labelled simulated days. Production stays flat while electricity rises; the app calculates the energy intensity, not the model. |
| 0:31–0:39 | The strongest candidate | September seventeenth is thirty six percent above its trailing baseline: method baseline v1, a fifteen percent prototype threshold. |
| 0:39–0:57 | One pipeline, no black box | Route handlers validate the request, the analysis engine computes the metrics, a context builder packages thirteen evidence items, Gemini answers as JSON, and the server validates it before storing. |
| 0:57–1:03 | Investigation queue | Two candidate days, each with deviation, severity and estimated impact. |
| 1:03–1:17 | Run the investigation | The button calls the backend. Metrics are computed first; only then is the model asked to explain them. |
| 1:17–1:27 | Evidence before explanation | Actual and baseline intensity, the comparison window and the deviation are stored with the result. |
| 1:27–1:33 | E1–E13, the only context the model sees | The model cannot run SQL or shell, and citations of evidence it never saw are discarded. |
| 1:33–1:41 | A transparent cost estimate | Excess kilowatt hours times tariff. The formula and its assumptions are printed: a potential estimate, not a verified saving. |
| 1:41–1:49 | Live model — gemini-3.8-flash | Gemini wrote this from the supplied evidence only. Its answer is validated server side before it is stored. |
| 1:49–1:56 | Hypotheses, not conclusions | Each possible factor lists the evidence that is still missing before it can be confirmed. |
| 1:56–2:05 | AI suggests, a person decides | Recommended checks are human inspections. No autonomous equipment control is ever proposed. |
| 2:05–2:20 | The app shows its work | Every claim cites evidence IDs, failures are stored as failures, and simulated data is labelled everywhere. |
| 2:20–2:30 | Record the human decision | The operator adds the check they intend to run, then marks it completed. |
| 2:30–2:35 | Human sign-off, then verification | Completing the action unlocks a before and after comparison. |
| 2:35–2:41 | Observed change, not causation | It reports the observed change, and states that other factors are not controlled. |
| 2:41–2:49 | Every row carries its source | Rows are labelled simulated. Days without enough baseline are reported as insufficient, never estimated. |
| 2:49–2:56 | Failure shown as failure | The health endpoint reports database and model state. A failed call is stored as failed, with no invented answer. |
| 2:56–3:13 | A working, honest prototype | Live today on Vercel with Neon PostgreSQL and Gemini, and ready for Cloud Run. Next: real weather data, CSV import and authentication, without dropping the evidence trail. |
