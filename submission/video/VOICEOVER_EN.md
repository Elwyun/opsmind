# OpsMind demo — voice-over script

Voice used for this cut: **Microsoft Zira Desktop** (Windows speech engine).
Video: `OpsMind_Demo_Narrated_EN.mp4` · 3:27 · captions burned in, narrated.

Re-record with a human voice by reading the *Line* column inside its window. Timing comes from
the recording's SRT; lines come from `voiceover-en.json`, keyed by the caption title.

| Window | Section | Line |
| --- | --- | --- |
| 0:00–0:09 | OpsMind — AI operational intelligence | OpsMind turns separated operations data into evidence a manager can check. |
| 0:09–0:21 | The numbers live in separate places | Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it. |
| 0:21–0:31 | One period, three numbers | Thirty labelled simulated days. Production stays flat while electricity rises; the app calculates the energy intensity, not the model. |
| 0:31–0:38 | The strongest candidate | September seventeenth is thirty six percent above its trailing baseline: method baseline v1, a fifteen percent prototype threshold. |
| 0:38–1:01 | One pipeline, no black box | Route handlers validate the request, the analysis engine computes the metrics, a context builder packages thirteen evidence items, Gemini answers as JSON, and the server validates it before storing. |
| 1:01–1:06 | Investigation queue | Two candidate days, each with deviation, severity and estimated impact. |
| 1:06–1:20 | Run the investigation | The button calls the backend. Metrics are computed first; only then is the model asked to explain them. |
| 1:20–1:30 | Evidence before explanation | Actual and baseline intensity, the comparison window and the deviation are stored with the result. |
| 1:30–1:36 | E1–E13, the only context the model sees | The model cannot run SQL or shell, and citations of evidence it never saw are discarded. |
| 1:36–1:44 | A transparent cost estimate | Excess kilowatt hours times tariff. The formula and its assumptions are printed: a potential estimate, not a verified saving. |
| 1:44–1:52 | Live model — gemini-3.8-flash | Gemini wrote this from the supplied evidence only. Its answer is validated server side before it is stored. |
| 1:52–1:59 | Hypotheses, not conclusions | Each possible factor lists the evidence that is still missing before it can be confirmed. |
| 1:59–2:08 | AI suggests, a person decides | Recommended checks are human inspections. No autonomous equipment control is ever proposed. |
| 2:08–2:26 | The app shows its work | Every claim cites evidence IDs, failures are stored as failures, and simulated data is labelled everywhere. |
| 2:26–2:37 | Record the human decision | The operator adds the check they intend to run, then marks it completed. |
| 2:37–2:42 | Human sign-off, then verification | Completing the action unlocks a before and after comparison. |
| 2:42–2:48 | Observed change, not causation | It reports the observed change, and states that other factors are not controlled. |
| 2:48–2:57 | Every row carries its source | Rows are labelled simulated. Days without enough baseline are reported as insufficient, never estimated. |
| 2:57–3:04 | Failure shown as failure | The health endpoint reports database and model state. A failed call is stored as failed, with no invented answer. |
| 3:04–3:26 | A working, honest prototype | Next: a Cloud Run deployment, real weather data, CSV import and authentication, without dropping the evidence trail. |
