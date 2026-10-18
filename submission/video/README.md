# OpsMind demo video — draft

| | |
| --- | --- |
| File | `OpsMind_Demo_Draft_EN.mp4` |
| Duration | **2:39** (submission limit: under 3:00) |
| Format | H.264 MP4, 1600×900, 30 fps, no audio |
| Captions | Burned in (lower third) + `OpsMind_Demo_Draft_EN.srt` |
| Script | `OpsMind_Demo_Draft_EN.captions.md` (timed, voice-over ready) |
| Recorded | 18 Oct 2026 against a local production build (`next start`) |
| AI provider at record time | **Live Gemini** — `gemini-3.8-flash` (`GEMINI_API_KEY` set) |

The take walks through the real UI: Overview → investigation queue → investigate →
evidence E1–E13 → cost formula → live Gemini output → human action → before/after
comparison → data labels → `/api/health`.

It is a **draft**, not the final submission video:

- It is screen-only, with burned-in captions and no voice-over.
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
DEMO_URL=https://YOUR-SERVICE.run.app npm run demo:record
```

The script resets the demo data, drives the journey in Chromium, adds the pointer
and captions, converts WebM → MP4 with ffmpeg, and refuses to finish if the take is
longer than 179 seconds. Set `OPSMIND_DEMO_CAPTIONS=off` to record a clean plate for
a voice-over; the SRT/caption table is written either way.

## Final video checklist

- [ ] Record against the deployed URL in a normal browser (address bar visible)
- [ ] Add voice-over from `OpsMind_Demo_Draft_EN.captions.md` (or upload the SRT)
- [ ] Upload as unlisted YouTube/Drive and put the link in the submission form
- [ ] Confirm the AI panel label matches the deployment (`Live model` only with a key)
