# GitHub repository metadata

Use these values when creating the public repository. They are written here because this environment
has no `gh` CLI and no GitHub credentials, so the remote cannot be created or pushed from here.

## Description

> OpsMind — AI Operational Intelligence prototype that detects potential energy inefficiency from
> production, electricity, operating hours and weather. Deterministic metrics, Gemini explanations,
> evidence IDs, human actions and before/after verification.

Shorter alternative:

> AI operational intelligence for SME manufacturers: deterministic energy-intensity metrics plus
> Gemini explanations, evidence citations and human-in-the-loop actions.

## Topics

```text
nextjs
react
typescript
prisma
postgresql
gemini
google-cloud
cloud-run
energy-efficiency
manufacturing
hackathon
ai-builder-cup
```

## Publish

Create an empty **public** repository named `opsmind` in the GitHub UI, then:

```bash
git remote add origin https://github.com/Elwyun/opsmind.git
git push -u origin main
```

If the GitHub CLI is available:

```bash
gh repo create opsmind --public --source=. --remote=origin --push

gh repo edit \
  --description "OpsMind — AI Operational Intelligence prototype that detects potential energy inefficiency from production, electricity, operating hours and weather. Deterministic metrics, Gemini explanations, evidence IDs, human actions and before/after verification." \
  --add-topic nextjs \
  --add-topic react \
  --add-topic typescript \
  --add-topic prisma \
  --add-topic postgresql \
  --add-topic gemini \
  --add-topic google-cloud \
  --add-topic cloud-run \
  --add-topic energy-efficiency \
  --add-topic manufacturing \
  --add-topic hackathon \
  --add-topic ai-builder-cup
```

After pushing, open the repository in a private browser window to confirm it is publicly accessible,
then add the URL to the GitHub link on the deck's “Submission links” slide and to the Hack2skill form.

## Before pushing

```bash
git status --short
git log --oneline -3
grep -RIn "AIza" --exclude-dir=.git --exclude-dir=node_modules . || true
```

The last check should find only the checklist text in `SUBMISSION.md`, never a real key. `.env` is
ignored and must not be committed.
