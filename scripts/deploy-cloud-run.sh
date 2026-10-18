#!/usr/bin/env bash
#
# Deploy OpsMind to Cloud Run.
#
#   bash scripts/deploy-cloud-run.sh                    # uses the defaults below
#   PROJECT_ID=my-project REGION=asia-southeast1 bash scripts/deploy-cloud-run.sh
#   DRY_RUN=true bash scripts/deploy-cloud-run.sh       # print, do not execute
#
# Reads DATABASE_URL, GEMINI_API_KEY, GEMINI_MODEL and DEMO_RESET_TOKEN from the
# environment or from .env. Secrets are piped to Secret Manager and never
# printed. Cloud Run needs billing enabled on the project; the script checks that
# first and stops with the exact console link if it is not.
#
# Prerequisites: gcloud (authenticated), node, curl. The calling account needs
# Owner/Editor on the project. Neon (or another managed PostgreSQL) must already
# hold the schema and demo rows; run `npm run db:setup` with the direct URL first,
# or set SEED=true to let this script do it.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0869954467}"
REGION="${REGION:-asia-southeast1}"
SERVICE="${SERVICE:-opsmind}"
GEMINI_SECRET="${GEMINI_SECRET:-gemini-api-key}"
RESET_SECRET="${RESET_SECRET:-demo-reset-token}"
DATABASE_SECRET="${DATABASE_SECRET:-database-url}"
SEED="${SEED:-false}"
DRY_RUN="${DRY_RUN:-false}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say() { printf '\n== %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
run() {
  if [ "$DRY_RUN" = "true" ]; then
    printf 'DRY RUN: %s\n' "$*"
  else
    "$@"
  fi
}

env_value() {
  node -e "require('dotenv').config({quiet:true});process.stdout.write(process.env['$1']||'')" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
say "Preflight"
command -v gcloud >/dev/null || die "gcloud is not installed. See https://cloud.google.com/sdk/docs/install"
command -v node >/dev/null || die "node is required to read .env values."
command -v curl >/dev/null || die "curl is required for the smoke test."

ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)"
[ -n "$ACCOUNT" ] || die "No active gcloud account. Run: gcloud auth login"
echo "account:     $ACCOUNT"
echo "project:     $PROJECT_ID"
echo "region:      $REGION"
echo "service:     $SERVICE"

gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null 2>&1 \
  || die "Cannot read project '$PROJECT_ID' with this account. Check the ID and your IAM role (Owner/Editor)."

BILLING="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null || echo unknown)"
echo "billing:     $BILLING"
case "$BILLING" in
  True | true) ;;
  *)
    if [ "${SKIP_BILLING_CHECK:-false}" = "true" ]; then
      echo "warning: billing is not enabled; continuing because SKIP_BILLING_CHECK=true"
    else
      cat <<EOF

Cloud Run cannot be used until billing is enabled on $PROJECT_ID.

  1. Create or pick a billing account: https://console.cloud.google.com/billing
  2. Link it: https://console.cloud.google.com/billing/link?project=$PROJECT_ID
  3. Re-run this script. Check with:
       gcloud billing projects describe $PROJECT_ID --format='value(billingEnabled)'

EOF
      exit 2
    fi
    ;;
esac

DATABASE_URL="${DATABASE_URL:-$(env_value DATABASE_URL)}"
GEMINI_API_KEY="${GEMINI_API_KEY:-$(env_value GEMINI_API_KEY)}"
GEMINI_MODEL="${GEMINI_MODEL:-$(env_value GEMINI_MODEL)}"
DEMO_RESET_TOKEN="${DEMO_RESET_TOKEN:-$(env_value DEMO_RESET_TOKEN)}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.8-flash}"

[ -n "$DATABASE_URL" ] || die "DATABASE_URL is empty (environment or .env)."
[ -n "$GEMINI_API_KEY" ] || die "GEMINI_API_KEY is empty; Cloud Run would fall back to the labelled mock."
case "$DATABASE_URL" in
  *127.0.0.1* | *localhost*) die "DATABASE_URL points at localhost; Cloud Run needs the managed Neon URL." ;;
esac
if [ -z "$DEMO_RESET_TOKEN" ]; then
  echo "warning: DEMO_RESET_TOKEN is empty — the public reset endpoint will be open."
fi

# ---------------------------------------------------------------------------
# APIs and secrets
# ---------------------------------------------------------------------------
say "Enabling APIs (idempotent)"
run gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"

upsert_secret() {
  local name="$1" value="$2"
  if [ "$DRY_RUN" = "true" ]; then
    printf 'DRY RUN: write secret %s (value hidden)\n' "$name"
    return
  fi
  if gcloud secrets describe "$name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
    echo "updated secret: $name"
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- \
      --replication-policy=automatic --project "$PROJECT_ID" >/dev/null
    echo "created secret: $name"
  fi
}

say "Secrets"
# The connection string carries the database password, so it goes to Secret
# Manager like the API key instead of a plain revision env var.
upsert_secret "$DATABASE_SECRET" "$DATABASE_URL"
upsert_secret "$GEMINI_SECRET" "$GEMINI_API_KEY"
if [ -n "$DEMO_RESET_TOKEN" ]; then
  upsert_secret "$RESET_SECRET" "$DEMO_RESET_TOKEN"
fi

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
say "Granting Secret Manager access to $RUNTIME_SA"
for secret in "$DATABASE_SECRET" "$GEMINI_SECRET" $([ -n "$DEMO_RESET_TOKEN" ] && echo "$RESET_SECRET"); do
  run gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" >/dev/null
done

# ---------------------------------------------------------------------------
# Optional: push the schema + seed the managed database
# ---------------------------------------------------------------------------
if [ "$SEED" = "true" ]; then
  say "Seeding the managed database"
  echo "This force-pushes the schema and re-seeds the deterministic demo rows."
  if [ "$DRY_RUN" = "true" ]; then
    echo "DRY RUN: DATABASE_URL=<managed> npm run db:setup"
  else
    DATABASE_URL="$DATABASE_URL" npm run db:setup
  fi
fi

# ---------------------------------------------------------------------------
# Deploy
# ---------------------------------------------------------------------------
say "Deploying $SERVICE"
SECRET_FLAGS="GEMINI_API_KEY=$GEMINI_SECRET:latest"
if [ -n "$DEMO_RESET_TOKEN" ]; then
  SECRET_FLAGS="$SECRET_FLAGS,DEMO_RESET_TOKEN=$RESET_SECRET:latest"
fi

if [ "$DRY_RUN" = "true" ]; then
  # Never echo the connection string, even in a dry run.
  echo "DRY RUN: gcloud run deploy $SERVICE --source . --project $PROJECT_ID --region $REGION"
  echo "         --allow-unauthenticated --set-env-vars GEMINI_MODEL=$GEMINI_MODEL"
  echo "         --set-secrets DATABASE_URL=$DATABASE_SECRET:latest,$SECRET_FLAGS"
else
  gcloud run deploy "$SERVICE" \
    --source . \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --allow-unauthenticated \
    --set-env-vars "GEMINI_MODEL=$GEMINI_MODEL" \
    --set-secrets "DATABASE_URL=$DATABASE_SECRET:latest,$SECRET_FLAGS" \
    --quiet
fi

if [ "$DRY_RUN" = "true" ]; then
  say "Dry run complete; nothing was deployed."
  exit 0
fi

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
[ -n "$URL" ] || die "Deployment finished but no service URL was returned."

# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------
say "Smoke test: $URL/api/health"
for attempt in $(seq 1 24); do
  if BODY="$(curl -fsS -m 10 "$URL/api/health" 2>/dev/null)"; then
    echo "$BODY"
    case "$BODY" in
      *'"database":"ok"'*) echo "database: ok" ;;
      *) die "Health responded but the database is not ok." ;;
    esac
    case "$BODY" in
      *'"isLive":true'*) echo "model:     live Gemini" ;;
      *) echo "model:     mock (GEMINI_API_KEY did not reach the service)" ;;
    esac
    break
  fi
  if [ "$attempt" = "24" ]; then
    die "Health endpoint did not answer within 120s. Check: gcloud run services logs read $SERVICE --region $REGION --limit 100"
  fi
  sleep 5
done

cat <<EOF

Deployed: $URL

Next:
  1. Open $URL and check SIMULATED DATA, 17 Sep 2026 (+36.0%) and Investigate.
  2. Re-record the demo against it:
       DEMO_URL=$URL npm run demo:record && npm run demo:voiceover
  3. Put the URL in submission/FORM_FIELDS.md, submission/SUBMISSION_TEXT.md and SUBMISSION.md.
EOF
