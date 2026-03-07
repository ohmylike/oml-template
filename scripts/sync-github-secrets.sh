#!/bin/bash
set -euo pipefail

usage() {
  cat <<'EOF'
Sync GitHub Actions secrets from 1Password into the current repo.

Usage:
  ./scripts/sync-github-secrets.sh \
    --turso-production-auth-token-ref 'op://ohmylike-prod/<service_name>-prod/turso/auth_token'

Options:
  --repo <owner/name>                     Override the target GitHub repo.
  --turso-production-auth-token-ref <ref> Required 1Password secret reference for the per-service production DB auth token.
  --dry-run                               Print the refs that would be synced without writing secrets.
  -h, --help                              Show this help.

Environment overrides:
  OP_CLOUDFLARE_API_TOKEN_REF       Default: op://ohmylike-prod/cloudflare/api_token
  OP_CLOUDFLARE_ACCOUNT_ID_REF      Default: op://ohmylike-prod/cloudflare/account_id
  OP_TURSO_API_TOKEN_REF            Default: op://ohmylike-prod/turso/api_token
  OP_TURSO_PREVIEW_AUTH_TOKEN_REF   Default: op://ohmylike-prod/turso/preview_auth_token
EOF
}

REPO=""
DRY_RUN=false
TURSO_PRODUCTION_AUTH_TOKEN_REF=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="${2:?missing value for --repo}"
      shift 2
      ;;
    --turso-production-auth-token-ref)
      TURSO_PRODUCTION_AUTH_TOKEN_REF="${2:?missing value for --turso-production-auth-token-ref}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) is not installed." >&2
  exit 2
fi

if ! $DRY_RUN && ! command -v op >/dev/null 2>&1; then
  echo "Error: 1Password CLI (op) is not installed." >&2
  exit 2
fi

if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi

if [[ -z "$REPO" ]]; then
  echo "Error: could not detect the target repo. Pass --repo <owner/name>." >&2
  exit 2
fi

if [[ -z "$TURSO_PRODUCTION_AUTH_TOKEN_REF" ]]; then
  echo "Error: --turso-production-auth-token-ref is required." >&2
  exit 2
fi

if ! $DRY_RUN && ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run 'gh auth login' first." >&2
  exit 2
fi

if ! $DRY_RUN && ! op whoami >/dev/null 2>&1; then
  echo "Error: op is not authenticated. Run 'op signin' first." >&2
  exit 2
fi

OP_CLOUDFLARE_API_TOKEN_REF="${OP_CLOUDFLARE_API_TOKEN_REF:-op://ohmylike-prod/cloudflare/api_token}"
OP_CLOUDFLARE_ACCOUNT_ID_REF="${OP_CLOUDFLARE_ACCOUNT_ID_REF:-op://ohmylike-prod/cloudflare/account_id}"
OP_TURSO_API_TOKEN_REF="${OP_TURSO_API_TOKEN_REF:-op://ohmylike-prod/turso/api_token}"
OP_TURSO_PREVIEW_AUTH_TOKEN_REF="${OP_TURSO_PREVIEW_AUTH_TOKEN_REF:-op://ohmylike-prod/turso/preview_auth_token}"

sync_secret() {
  local secret_name="$1"
  local secret_ref="$2"

  if $DRY_RUN; then
    echo "[dry-run] ${secret_name} <= ${secret_ref}"
    return
  fi

  echo "Syncing ${secret_name} to ${REPO}"
  op read "$secret_ref" | gh secret set "$secret_name" --repo "$REPO"
}

sync_secret "CLOUDFLARE_API_TOKEN" "$OP_CLOUDFLARE_API_TOKEN_REF"
sync_secret "CLOUDFLARE_ACCOUNT_ID" "$OP_CLOUDFLARE_ACCOUNT_ID_REF"
sync_secret "TURSO_API_TOKEN" "$OP_TURSO_API_TOKEN_REF"
sync_secret "TURSO_PREVIEW_AUTH_TOKEN" "$OP_TURSO_PREVIEW_AUTH_TOKEN_REF"
sync_secret "TURSO_PRODUCTION_AUTH_TOKEN" "$TURSO_PRODUCTION_AUTH_TOKEN_REF"

if ! $DRY_RUN; then
  echo "Done. GitHub Actions secrets are synced for ${REPO}."
fi
