# OpsMind demo video — draft

| | |
| --- | --- |
| File | `OpsMind_Demo_Narrated_EN.mp4` (narrated cut) · `OpsMind_Demo_Draft_EN.mp4` (silent cut, same take) |
| Duration | **3:27** (the submission form asks for 3–4 minutes) |
| Format | H.264 MP4, 1600×900, 30 fps, AAC audio (narrated cut) |
| Captions | Burned in (lower third) + `OpsMind_Demo_Draft_EN.srt` |
| Scripts | `VOICEOVER_EN.md` + `voiceover-en.json` (timed narration) · `OpsMind_Demo_Draft_EN.captions.md` (caption table) |
| Recorded | 18 Oct 2026 against a local production build (`next start`) |
| AI provider at record time | **Live Gemini** — `gemini-3.8-flash` (`GEMINI_API_KEY` set) |
| Narration | Windows speech engine (`Microsoft Zira Desktop`), fitted to the caption windows |

## Narration

`npm run demo:voiceover` reads `voiceover-en.json`, synthesises every line, fits it into its caption
window (tempo-up capped at 1.45×, otherwise starts up to 0.9 s earlier) and muxes the track into the
recording without re-encoding the video. Delete a line from the JSON to leave that window silent, or
set `OPSMIND_TTS_VOICE` to another installed voice.

For a human voice-over, read `VOICEOVER_EN.md`; the times come from the same JSON.

The take walks through the real UI: Overview → investigation queue → investigate →
evidence E1–E13 → cost formula → live Gemini output → human action → before/after
comparison → data labels → `/api/health`.

It is a **draft**, not the final submission video:

- The narration is a synthetic voice, not a human recording — replace it if the team prefers.
- It records `localhost`, not the deployed Cloud Run URL, and there is no browser
  chrome/address bar in the frame (Playwright captures the viewport only).
- The numbers come from the deterministic **simulated** dataset; the video says so
  on screen and in the captions. No saving is claimed.

## Re-recording

```bash
npm run build
PORT=3100 npm start            # or use the deployed URL
DEMO_URL=http://localhost:3100 npm run demo:record
```

Against the deployed service:

```bash
DEMO_URL=https://opsmind-one.vercel.app npm run demo:record
npm run demo:voiceover
```

The script resets the demo data, drives the journey in Chromium, adds the pointer
and captions, converts WebM → MP4 with ffmpeg, and refuses to finish if the take is
longer than 239 seconds. Set `OPSMIND_DEMO_CAPTIONS=off` to record a clean plate for
a voice-over; the SRT/caption table is written either way.

## Final video checklist

- [ ] Record against the deployed URL in a normal browser (address bar visible)
- [x] Voice-over track (synthetic) fitted to the caption windows
- [ ] Optional: replace the synthetic voice with a human reading `VOICEOVER_EN.md`
- [ ] Upload as unlisted YouTube/Drive and put the link in the submission form
- [ ] Confirm the AI panel label matches the deployment (`Live model` only with a key)
