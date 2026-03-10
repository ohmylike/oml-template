#!/bin/bash
set -euo pipefail

SKIP_INFRA="${OML_BOOTSTRAP_SKIP_INFRA:-0}"
SKIP_DEV_VARS="${OML_BOOTSTRAP_SKIP_DEV_VARS:-0}"
KV_NAMESPACE_ID="${OML_BOOTSTRAP_KV_NAMESPACE_ID:-0154d85d8ec744069f871b097435751f}"
BOOTSTRAP_DEFAULT_WEB_VARIANT="b2b"
BOOTSTRAP_DEFAULT_FEATURES_RAW="none"
BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV="b2b,b2c"
BOOTSTRAP_ALLOWED_FEATURES_CSV="user-auth,tracking"
BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV="user-auth,tracking,none"

SERVICE_NAME=""
CLI_WEB_VARIANT=""
CLI_FEATURES_RAW=""
BOOTSTRAP_WEB_VARIANT=""
BOOTSTRAP_FEATURES_CSV=""
PROD_BUCKET_NAME=""
DEV_BUCKET_NAME=""
PROD_DB_NAME=""
DEV_DB_NAME=""

usage() {
  echo "Usage: ./bootstrap.sh <service_name> [--web ${BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV//,/|}] [--features ${BOOTSTRAP_ALLOWED_FEATURES_CSV}|none]" >&2
}

fail() {
  echo "Error: $*" >&2
  exit 1
}

trim_whitespace() {
  local value="${1-}"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  printf '%s' "${value}"
}

format_features_csv() {
  local features_csv="${1-}"

  if [[ -n "${features_csv}" ]]; then
    printf '%s' "${features_csv}"
    return
  fi

  printf 'none'
}

reset_bootstrap_runtime_state() {
  SERVICE_NAME=""
  CLI_WEB_VARIANT=""
  CLI_FEATURES_RAW=""
  BOOTSTRAP_WEB_VARIANT=""
  BOOTSTRAP_FEATURES_CSV=""
  PROD_BUCKET_NAME=""
  DEV_BUCKET_NAME=""
  PROD_DB_NAME=""
  DEV_DB_NAME=""
}

parse_args() {
  reset_bootstrap_runtime_state

  if [[ $# -eq 0 ]]; then
    usage
    exit 1
  fi

  if [[ "${1}" == --* ]]; then
    usage
    exit 1
  fi

  SERVICE_NAME="$1"
  shift

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --web)
        if [[ $# -lt 2 ]]; then
          fail "--web requires a value. Allowed values: ${BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV}"
        fi
        if [[ -n "${CLI_WEB_VARIANT}" ]]; then
          fail "--web may only be specified once."
        fi

        CLI_WEB_VARIANT="$2"
        shift 2
        ;;
      --features)
        if [[ $# -lt 2 ]]; then
          fail "--features requires a value. Allowed values: ${BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV}"
        fi
        if [[ -n "${CLI_FEATURES_RAW}" ]]; then
          fail "--features may only be specified once."
        fi

        CLI_FEATURES_RAW="$2"
        shift 2
        ;;
      --*)
        fail "unknown option '$1'"
        ;;
      *)
        usage
        exit 1
        ;;
    esac
  done
}

validate_service_name() {
  if [[ ! "${SERVICE_NAME}" =~ ^[a-z][a-z0-9-]*$ ]]; then
    fail "service_name must be lowercase alphanumeric (hyphens allowed, must start with a letter)"
  fi
}

initialize_service_resource_names() {
  PROD_BUCKET_NAME="oml-${SERVICE_NAME}-uploads"
  DEV_BUCKET_NAME="oml-${SERVICE_NAME}-uploads-dev"
  PROD_DB_NAME="oml-${SERVICE_NAME}-db-prod"
  DEV_DB_NAME="oml-${SERVICE_NAME}-db-dev"
}

normalize_web_variant() {
  local raw_value

  raw_value="$(trim_whitespace "${1-}")"

  case "${raw_value}" in
    b2b|b2c)
      printf '%s' "${raw_value}"
      return 0
      ;;
    *)
      echo "Error: invalid web variant '${raw_value}'. Allowed values: ${BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV}" >&2
      return 1
      ;;
  esac
}

normalize_features_csv() {
  local raw_value
  local trimmed_value
  local requested_features=()
  local feature_name
  local include_user_auth=0
  local include_tracking=0
  local normalized_features=()

  raw_value="${1-}"
  trimmed_value="$(trim_whitespace "${raw_value}")"

  if [[ -z "${trimmed_value}" ]]; then
    echo "Error: invalid features value ''. Allowed values: ${BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV}" >&2
    return 1
  fi

  IFS=',' read -r -a requested_features <<< "${trimmed_value}"

  if [[ "${#requested_features[@]}" -eq 1 ]]; then
    feature_name="$(trim_whitespace "${requested_features[0]}")"
    if [[ "${feature_name}" == "none" ]]; then
      printf ''
      return 0
    fi
  fi

  for feature_name in "${requested_features[@]}"; do
    feature_name="$(trim_whitespace "${feature_name}")"

    if [[ -z "${feature_name}" ]]; then
      echo "Error: invalid features value '${raw_value}'. Allowed values: ${BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV}" >&2
      return 1
    fi

    case "${feature_name}" in
      user-auth)
        include_user_auth=1
        ;;
      tracking)
        include_tracking=1
        ;;
      none)
        echo "Error: 'none' cannot be combined with other features." >&2
        return 1
        ;;
      *)
        echo "Error: invalid feature '${feature_name}'. Allowed values: ${BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV}" >&2
        return 1
        ;;
    esac
  done

  if [[ "${include_user_auth}" == "1" ]]; then
    normalized_features+=("user-auth")
  fi

  if [[ "${include_tracking}" == "1" ]]; then
    normalized_features+=("tracking")
  fi

  local IFS=','
  printf '%s' "${normalized_features[*]}"
}

is_interactive_tty() {
  [[ -t 0 && -t 1 ]]
}

prompt_web_variant() {
  local raw_input
  local normalized_value

  while true; do
    printf 'Select web variant [1] b2b [2] b2c (default: %s): ' "${BOOTSTRAP_DEFAULT_WEB_VARIANT}" >&2
    if ! read -r raw_input; then
      raw_input=""
    fi

    raw_input="$(trim_whitespace "${raw_input}")"

    case "${raw_input}" in
      "")
        printf '%s' "${BOOTSTRAP_DEFAULT_WEB_VARIANT}"
        return 0
        ;;
      1)
        printf 'b2b'
        return 0
        ;;
      2)
        printf 'b2c'
        return 0
        ;;
    esac

    if normalized_value="$(normalize_web_variant "${raw_input}")"; then
      printf '%s' "${normalized_value}"
      return 0
    fi
  done
}

prompt_features_csv() {
  local raw_input
  local normalized_value

  while true; do
    printf 'Select features [%s|none] (default: %s): ' "${BOOTSTRAP_ALLOWED_FEATURES_CSV}" "${BOOTSTRAP_DEFAULT_FEATURES_RAW}" >&2
    if ! read -r raw_input; then
      raw_input=""
    fi

    raw_input="$(trim_whitespace "${raw_input}")"

    if [[ -z "${raw_input}" ]]; then
      printf ''
      return 0
    fi

    if normalized_value="$(normalize_features_csv "${raw_input}")"; then
      printf '%s' "${normalized_value}"
      return 0
    fi
  done
}

resolve_selection() {
  if [[ -n "${CLI_WEB_VARIANT}" ]]; then
    BOOTSTRAP_WEB_VARIANT="$(normalize_web_variant "${CLI_WEB_VARIANT}")"
  elif is_interactive_tty; then
    BOOTSTRAP_WEB_VARIANT="$(prompt_web_variant)"
  else
    BOOTSTRAP_WEB_VARIANT="${BOOTSTRAP_DEFAULT_WEB_VARIANT}"
  fi

  if [[ -n "${CLI_FEATURES_RAW}" ]]; then
    BOOTSTRAP_FEATURES_CSV="$(normalize_features_csv "${CLI_FEATURES_RAW}")"
  elif is_interactive_tty; then
    BOOTSTRAP_FEATURES_CSV="$(prompt_features_csv)"
  else
    BOOTSTRAP_FEATURES_CSV=""
  fi

  export BOOTSTRAP_WEB_VARIANT BOOTSTRAP_FEATURES_CSV

  echo "Resolved selection: web=${BOOTSTRAP_WEB_VARIANT}, features=$(format_features_csv "${BOOTSTRAP_FEATURES_CSV}")"
}

has_feature() {
  local feature_name="$1"

  if [[ -z "${BOOTSTRAP_FEATURES_CSV}" ]]; then
    return 1
  fi

  case ",${BOOTSTRAP_FEATURES_CSV}," in
    *,"${feature_name}",*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

require_command() {
  local command_name="$1"

  if command -v "$command_name" >/dev/null 2>&1; then
    return
  fi

  echo "Error: required command '$command_name' is not installed." >&2
  exit 2
}

require_turso_auth() {
  if turso auth whoami >/dev/null 2>&1; then
    return
  fi

  echo "Error: Turso CLI is not authenticated. Run 'turso auth login' first." >&2
  exit 2
}

require_wrangler_auth() {
  if npx wrangler whoami >/dev/null 2>&1; then
    return
  fi

  echo "Error: Wrangler is not authenticated. Run 'npx wrangler login' first." >&2
  exit 2
}

r2_bucket_exists() {
  local bucket_name="$1"

  npx wrangler r2 bucket list \
    | awk -F':[[:space:]]*' '/^name:/{print $2}' \
    | grep -Fxq "${bucket_name}"
}

ensure_r2_bucket() {
  local bucket_name="$1"

  if r2_bucket_exists "${bucket_name}"; then
    echo "R2 bucket already exists: ${bucket_name}"
    return
  fi

  echo "Creating R2 bucket: ${bucket_name}"
  npx wrangler r2 bucket create "${bucket_name}"
}

turso_db_exists() {
  local database_name="$1"

  turso db show "${database_name}" >/dev/null 2>&1
}

ensure_turso_db() {
  local database_name="$1"

  if turso_db_exists "${database_name}"; then
    echo "Turso database already exists: ${database_name}"
    return
  fi

  echo "Creating Turso database: ${database_name}"
  turso db create "${database_name}" --group ohmylike-app
}

write_dev_vars() {
  local db_url
  local dev_token

  db_url="$(turso db show "${DEV_DB_NAME}" --url | tr -d '\r\n')"
  dev_token="$(turso db tokens create "${DEV_DB_NAME}" | tail -n 1 | tr -d '\r\n')"

  if [[ -z "${db_url}" ]]; then
    echo "Error: failed to resolve a dev database URL for ${DEV_DB_NAME}." >&2
    exit 1
  fi

  if [[ -z "${dev_token}" ]]; then
    echo "Error: failed to create a dev database token for ${DEV_DB_NAME}." >&2
    exit 1
  fi

  cat > .dev.vars <<EOF
# Generated by ./bootstrap.sh for local wrangler dev.
TURSO_DATABASE_URL=${db_url}
TURSO_AUTH_TOKEN=${dev_token}
EOF

  chmod 600 .dev.vars 2>/dev/null || true
  echo "Wrote .dev.vars for local development."
}

replace_placeholders() {
  require_command perl

  find . -type f \( -name "*.toml" -o -name "*.yml" -o -name "*.yaml" \
    -o -name "*.ts" -o -name "*.tsx" -o -name "*.md" -o -name "*.json" \
    -o -name "*.html" -o -name "*.css" \) \
    ! -path './.git/*' ! -path '*/node_modules/*' -print0 \
    | xargs -0 perl -pi -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g; s/__KV_NAMESPACE_ID__/${KV_NAMESPACE_ID}/g"
}

apply_web_variant_selection() {
  echo "Applying web variant selection (v1 no-op): ${BOOTSTRAP_WEB_VARIANT}"
}

apply_feature_selection() {
  echo "Applying feature selection (v1 no-op): $(format_features_csv "${BOOTSTRAP_FEATURES_CSV}")"
}

provision_infrastructure() {
  if [[ "${SKIP_INFRA}" == "1" ]]; then
    echo "Skipping infrastructure provisioning (OML_BOOTSTRAP_SKIP_INFRA=1)"
    return
  fi

  require_command npx
  require_command turso
  require_turso_auth
  require_wrangler_auth

  ensure_r2_bucket "${PROD_BUCKET_NAME}"
  ensure_r2_bucket "${DEV_BUCKET_NAME}"

  ensure_turso_db "${PROD_DB_NAME}"
  ensure_turso_db "${DEV_DB_NAME}"

  if [[ "${SKIP_DEV_VARS}" == "1" ]]; then
    echo "Skipping .dev.vars generation (OML_BOOTSTRAP_SKIP_DEV_VARS=1)"
    return
  fi

  write_dev_vars
}

print_next_steps() {
  echo ""
  echo "Done! oml-${SERVICE_NAME} is ready."
  echo "Next:"
  echo "  1. Verify GitHub + 1Password auth: gh auth status && op whoami"
  echo "  2. Sync GitHub Actions secrets and enable production deploy:"
  echo "     ./scripts/sync-github-secrets.sh --turso-production-auth-token-ref 'op://ohmylike-prod/${SERVICE_NAME}-prod/turso/auth_token' --enable-production-deploy"
  echo "  3. git add -A && git commit -m 'bootstrap: initialize oml-${SERVICE_NAME}' && git push"
}

main() {
  parse_args "$@"
  validate_service_name
  initialize_service_resource_names
  resolve_selection

  echo "Bootstrapping oml-${SERVICE_NAME}..."

  replace_placeholders
  apply_web_variant_selection
  apply_feature_selection
  provision_infrastructure

  rm -- "$0"
  print_next_steps
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
