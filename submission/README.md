# OpsMind submission artifacts

## Included

| File | Purpose |
| --- | --- |
| `OpsMind_AI_Deck_EN.pptx` | Final English pitch deck, built from the official AI Builder Cup template |
| `OpsMind_AI_Deck_EN.pdf` | PDF export of the English deck |
| `OpsMind_AI_Deck_ID.pptx` | Indonesian version |
| `OpsMind_AI_Deck_ID.pdf` | PDF export of the Indonesian deck |
| `../submission-assets/screenshots/` | Real screenshots used in the deck |
| `../submission-assets/diagrams/` | Process and architecture diagrams used in the deck |
| `SUBMISSION_TEXT.md` | Form-ready copy (English) + Indonesian summary |
| `video/OpsMind_Demo_Draft_EN.mp4` | 2:39 screen-only demo draft, captions burned in |
| `video/OpsMind_Demo_Draft_EN.srt` | Captions as a subtitle file |
| `video/OpsMind_Demo_Draft_EN.captions.md` | Timed voice-over script |
| `video/README.md` | Video metadata, re-record command, final checklist |

The deck uses the official 16-slide template. Template placeholders, fake example URLs, and
unsupported claims were removed. The snapshots show the deterministic simulated dataset and the
labelled mock investigator; the deck does not claim verified savings or a live Gemini deployment.

## Before submitting

The deck's link slide deliberately says “see the submission form” instead of inventing URLs. Once
the public repository, demo video and deployed URL exist, rebuild the deck with the real values:

```bash
GITHUB_URL="https://github.com/Elwyun/opsmind" \
VIDEO_URL="https://youtu.be/..." \
DEMO_URL="https://opsmind-....run.app" \
PYTHONPATH=./.deck-tools python scripts/build_deck.py

# Then convert again with LibreOffice (Windows path shown):
"/c/Program Files/LibreOffice/program/soffice.exe" --headless \
  --convert-to pdf --outdir submission submission/OpsMind_AI_Deck_EN.pptx
```

The current deck is **not** a substitute for the deployed link, the public repository, or the video.
Those are separate mandatory submission fields.
