#!/bin/bash
set -euo pipefail

SERVICE_NAME="${1:?Usage: ./bootstrap.sh <service_name>}"
SKIP_INFRA="${OML_BOOTSTRAP_SKIP_INFRA:-0}"
KV_NAMESPACE_ID="${OML_BOOTSTRAP_KV_NAMESPACE_ID:-0154d85d8ec744069f871b097435751f}"

# Validate service name (lowercase alphanumeric + hyphens only)
if [[ ! "${SERVICE_NAME}" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: service_name must be lowercase alphanumeric (hyphens allowed, must start with a letter)"
  exit 1
fi

echo "Bootstrapping oml-${SERVICE_NAME}..."

# 1. Replace service and shared infra placeholders
find . -type f \( -name "*.toml" -o -name "*.yml" -o -name "*.yaml" \
  -o -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.json" \
  -o -name "*.html" -o -name "*.css" \) \
  ! -path './.git/*' ! -path '*/node_modules/*' -print0 \
  | xargs -0 perl -pi -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g; s/__KV_NAMESPACE_ID__/${KV_NAMESPACE_ID}/g"

# 2. Create per-service Cloudflare/Turso resources unless this is a CI smoke test
if [[ "${SKIP_INFRA}" == "1" ]]; then
  echo "Skipping infrastructure provisioning (OML_BOOTSTRAP_SKIP_INFRA=1)"
else
  echo "Creating R2 bucket: oml-${SERVICE_NAME}-uploads"
  npx wrangler r2 bucket create "oml-${SERVICE_NAME}-uploads"

  echo "Creating Turso databases..."
  turso db create "oml-${SERVICE_NAME}-db-prod" --group ohmylike-app
  turso db create "oml-${SERVICE_NAME}-db-dev" --group ohmylike-app
fi

# 3. Remove bootstrap.sh (one-time use)
rm -- "$0"

echo ""
echo "Done! oml-${SERVICE_NAME} is ready."
echo "Next: git add -A && git commit -m 'bootstrap: initialize oml-${SERVICE_NAME}' && git push"
