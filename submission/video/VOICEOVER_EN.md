# OpsMind demo — voice-over script

Voice used for this cut: **Microsoft Zira Desktop** (Windows speech engine).
Video: `OpsMind_Demo_Narrated_EN.mp4` · 2:39 · captions burned in, narrated.

Re-record with a human voice by reading the *Line* column inside its window; the timing comes from
`voiceover-en.json`. `npm run demo:voiceover` rebuilds the audio track.

| Window | Section | Line |
| --- | --- | --- |
| 0:00–0:08 | Intro | OpsMind turns separated operations data into evidence a manager can check. |
| 0:08–0:18 | Problem | Production, electricity, hours and weather sit in different sheets. A spike rarely explains itself, so nobody investigates it. |
| 0:18–0:27 | Overview | Thirty labelled simulated days. Production stays flat while electricity rises; the app calculates the energy intensity, not the model. |
| 0:27–0:35 | Strongest candidate | September seventeenth is thirty six percent above its trailing baseline: method baseline v1, a fifteen percent prototype threshold. |
| 0:35–0:41 | Investigation queue | Two candidate days, each with deviation, severity and estimated impact. |
| 0:41–0:57 | Run the investigation | The button calls the backend. Metrics are computed first; only then is the model asked to explain them. |
| 0:57–1:07 | Evidence | Actual and baseline intensity, the comparison window and the deviation are stored with the result. |
| 1:07–1:14 | Evidence list | The model cannot run SQL or shell, and citations of evidence it never saw are discarded. |
| 1:14–1:21 | Cost estimate | Excess kilowatt hours times tariff. The formula and its assumptions are printed: a potential estimate, not a verified saving. |
| 1:21–1:29 | Live model | Gemini wrote this from the supplied evidence only. Its answer is validated server side before it is stored. |
| 1:29–1:36 | Hypotheses | Each possible factor lists the evidence that is still missing before it can be confirmed. |
| 1:36–1:45 | Recommended checks | Recommended checks are human inspections. No autonomous equipment control is ever proposed. |
| 1:45–1:56 | Action | The operator adds the check they intend to run, then marks it completed. |
| 1:56–2:00 | Verification | Completing the action unlocks a before and after comparison. |
| 2:00–2:06 | Causation caveat | It reports the observed change, and states that other factors are not controlled. |
| 2:06–2:15 | Data labels | Rows are labelled simulated. Days without enough baseline are reported as insufficient, never estimated. |
| 2:15–2:23 | Health check | The health endpoint reports database and model state. A failed call is stored as failed, with no invented answer. |
| 2:23–2:37 | Closing | Next: a managed database, a Cloud Run deployment, real weather data and authentication, without dropping the evidence trail. |
