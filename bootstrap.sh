#!/bin/bash
set -euo pipefail

SERVICE_NAME="${1:?Usage: ./bootstrap.sh <service_name>}"

# Validate service name (lowercase alphanumeric + hyphens only)
if [[ ! "${SERVICE_NAME}" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: service_name must be lowercase alphanumeric (hyphens allowed, must start with a letter)"
  exit 1
fi

echo "Bootstrapping oml-${SERVICE_NAME}..."

# 1. Replace __SERVICE_NAME__ placeholder
find . -type f \( -name "*.toml" -o -name "*.yml" -o -name "*.yaml" \
  -o -name "*.ts" -o -name "*.md" -o -name "*.json" \) \
  ! -path './.git/*' \
  -exec sed -i '' "s/__SERVICE_NAME__/${SERVICE_NAME}/g" {} +

# 2. Create per-service Cloudflare R2 bucket
echo "Creating R2 bucket: oml-${SERVICE_NAME}-uploads"
npx wrangler r2 bucket create "oml-${SERVICE_NAME}-uploads"

# 3. Create per-service Turso databases
echo "Creating Turso databases..."
turso db create "oml-${SERVICE_NAME}-db-prod"
turso db create "oml-${SERVICE_NAME}-db-dev"

# 4. Remove bootstrap.sh (one-time use)
rm -- "$0"

echo ""
echo "Done! oml-${SERVICE_NAME} is ready."
echo "Next: git add -A && git commit -m 'bootstrap: initialize oml-${SERVICE_NAME}' && git push"
