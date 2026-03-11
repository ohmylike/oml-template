#!/bin/bash
set -euo pipefail

SKIP_INFRA="${OML_BOOTSTRAP_SKIP_INFRA:-0}"
SKIP_DEV_VARS="${OML_BOOTSTRAP_SKIP_DEV_VARS:-0}"
KV_NAMESPACE_ID="${OML_BOOTSTRAP_KV_NAMESPACE_ID:-0154d85d8ec744069f871b097435751f}"
BOOTSTRAP_DEFAULT_WEB_VARIANT="b2b"
BOOTSTRAP_DEFAULT_FEATURES_RAW="none"
BOOTSTRAP_DEFAULT_STYLE_FLAVOR="neutral"
BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV="b2b,b2c"
BOOTSTRAP_ALLOWED_FEATURES_CSV="user-auth,tracking"
BOOTSTRAP_ALLOWED_FEATURES_WITH_NONE_CSV="user-auth,tracking,none"
BOOTSTRAP_ALLOWED_STYLE_FLAVORS_CSV="terra,neutral,vivid"

SERVICE_NAME=""
CLI_WEB_VARIANT=""
CLI_FEATURES_RAW=""
CLI_STYLE_FLAVOR=""
BOOTSTRAP_WEB_VARIANT=""
BOOTSTRAP_FEATURES_CSV=""
BOOTSTRAP_STYLE_FLAVOR=""
PROD_BUCKET_NAME=""
DEV_BUCKET_NAME=""
PROD_DB_NAME=""
DEV_DB_NAME=""

usage() {
  echo "Usage: ./bootstrap.sh <service_name> [--web ${BOOTSTRAP_ALLOWED_WEB_VARIANTS_CSV//,/|}] [--features ${BOOTSTRAP_ALLOWED_FEATURES_CSV}|none] [--style ${BOOTSTRAP_ALLOWED_STYLE_FLAVORS_CSV//,/|}]" >&2
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
  CLI_STYLE_FLAVOR=""
  BOOTSTRAP_WEB_VARIANT=""
  BOOTSTRAP_FEATURES_CSV=""
  BOOTSTRAP_STYLE_FLAVOR=""
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
      --style)
        if [[ $# -lt 2 ]]; then
          fail "--style requires a value. Allowed values: ${BOOTSTRAP_ALLOWED_STYLE_FLAVORS_CSV}"
        fi
        if [[ -n "${CLI_STYLE_FLAVOR}" ]]; then
          fail "--style may only be specified once."
        fi

        CLI_STYLE_FLAVOR="$2"
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

normalize_style_flavor() {
  local raw_value

  raw_value="$(trim_whitespace "${1-}")"

  case "${raw_value}" in
    terra|neutral|vivid)
      printf '%s' "${raw_value}"
      return 0
      ;;
    *)
      echo "Error: invalid style flavor '${raw_value}'. Allowed values: ${BOOTSTRAP_ALLOWED_STYLE_FLAVORS_CSV}" >&2
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

prompt_style_flavor() {
  local raw_input
  local normalized_value

  while true; do
    printf 'Select style flavor [1] terra [2] neutral [3] vivid (default: %s): ' "${BOOTSTRAP_DEFAULT_STYLE_FLAVOR}" >&2
    if ! read -r raw_input; then
      raw_input=""
    fi

    raw_input="$(trim_whitespace "${raw_input}")"

    case "${raw_input}" in
      "")
        printf '%s' "${BOOTSTRAP_DEFAULT_STYLE_FLAVOR}"
        return 0
        ;;
      1)
        printf 'terra'
        return 0
        ;;
      2)
        printf 'neutral'
        return 0
        ;;
      3)
        printf 'vivid'
        return 0
        ;;
    esac

    if normalized_value="$(normalize_style_flavor "${raw_input}")"; then
      printf '%s' "${normalized_value}"
      return 0
    fi
  done
}

resolve_style_flavor_from_manifest() {
  # Reserved for a future catalog selection manifest.
  return 1
}

resolve_style_flavor_selection() {
  local manifest_style_flavor=""

  if [[ -n "${CLI_STYLE_FLAVOR}" ]]; then
    BOOTSTRAP_STYLE_FLAVOR="$(normalize_style_flavor "${CLI_STYLE_FLAVOR}")"
    return 0
  fi

  if manifest_style_flavor="$(resolve_style_flavor_from_manifest)"; then
    BOOTSTRAP_STYLE_FLAVOR="$(normalize_style_flavor "${manifest_style_flavor}")"
    return 0
  fi

  if is_interactive_tty; then
    BOOTSTRAP_STYLE_FLAVOR="$(prompt_style_flavor)"
  else
    BOOTSTRAP_STYLE_FLAVOR="${BOOTSTRAP_DEFAULT_STYLE_FLAVOR}"
  fi
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

  resolve_style_flavor_selection

  export BOOTSTRAP_WEB_VARIANT BOOTSTRAP_FEATURES_CSV BOOTSTRAP_STYLE_FLAVOR

  echo "Resolved selection: web=${BOOTSTRAP_WEB_VARIANT}, features=$(format_features_csv "${BOOTSTRAP_FEATURES_CSV}"), style=${BOOTSTRAP_STYLE_FLAVOR}"
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
    | xargs -0 perl -pi -e "s/__SERVICE_NAME__/${SERVICE_NAME}/g; s/__KV_NAMESPACE_ID__/${KV_NAMESPACE_ID}/g; s/__DEFAULT_STYLE_FLAVOR__/${BOOTSTRAP_STYLE_FLAVOR}/g"
}

prune_style_flavor_markers() {
  local flavor_name="$1"
  local file_path

  require_command perl

  while IFS= read -r -d '' file_path; do
    perl -0pi -e "s@/\\* style-flavor:${flavor_name}:start \\*/.*?/\\* style-flavor:${flavor_name}:end \\*/\\n?@@gs" "${file_path}"
  done < <(
    find . -type f \( -name "*.css" -o -name "*.ts" -o -name "*.tsx" \) \
      ! -path './.git/*' ! -path '*/node_modules/*' -print0
  )
}

style_flavor_label() {
  case "${BOOTSTRAP_STYLE_FLAVOR}" in
    terra)
      printf 'Terra'
      ;;
    neutral)
      printf 'Neutral'
      ;;
    vivid)
      printf 'Vivid'
      ;;
  esac
}

style_flavor_description() {
  case "${BOOTSTRAP_STYLE_FLAVOR}" in
    terra)
      printf '暖色寄りの default style flavor。'
      ;;
    neutral)
      printf 'zinc base の実務寄り flavor。'
      ;;
    vivid)
      printf '強い accent を持つ high-contrast flavor。'
      ;;
  esac
}

write_single_style_ui_matrix() {
  local style_label
  local style_description

  style_label="$(style_flavor_label)"
  style_description="$(style_flavor_description)"

  cat > packages/ui/src/ui-matrix.ts <<EOF
export const styleFlavorIds = ['${BOOTSTRAP_STYLE_FLAVOR}'] as const

export type StyleFlavorId = (typeof styleFlavorIds)[number]

export interface StyleFlavorMeta {
  label: string
  description: string
}

export const defaultStyleFlavorId = '${BOOTSTRAP_STYLE_FLAVOR}' as StyleFlavorId

export const styleFlavorMeta = {
  ${BOOTSTRAP_STYLE_FLAVOR}: {
    label: '${style_label}',
    description: '${style_description}',
  },
} as const satisfies Record<StyleFlavorId, StyleFlavorMeta>
EOF
}

write_single_style_web_index_html() {
  cat > apps/web/index.html <<EOF
<!DOCTYPE html>
<html lang="ja" data-style="${BOOTSTRAP_STYLE_FLAVOR}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>oml-${SERVICE_NAME}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client.tsx"></script>
  </body>
</html>
EOF
}

write_single_style_web_router() {
  cat > apps/web/src/router.tsx <<EOF
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { lazy, useEffect } from 'react'
import { defaultStyleFlavorId } from '@oml-${SERVICE_NAME}/ui/ui-matrix'

function RootStyleFlavorLayout() {
  useEffect(() => {
    document.documentElement.dataset.style = defaultStyleFlavorId
  }, [])

  return <Outlet />
}

const RootLayout = () => <RootStyleFlavorLayout />

const rootRoute = createRootRoute({
  component: RootLayout,
})

const IndexPage = lazy(() => import('./routes/index'))

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
})

const routeTree = rootRoute.addChildren([indexRoute])

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
EOF
}

write_single_style_www_root_route() {
  cat > apps/www/src/routes/__root.tsx <<EOF
import {
  createRootRoute,
  Link,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { defaultStyleFlavorId } from '@oml-${SERVICE_NAME}/ui/ui-matrix'
import appCss from '../styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'oml-${SERVICE_NAME}' },
      { name: 'description', content: 'oml-${SERVICE_NAME} - ohmylike.app service' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p>ページが見つかりません</p>
      <Link to="/">ホームに戻る</Link>
    </div>
  )
}

function RootComponent() {
  return (
    <html lang="ja" data-style={defaultStyleFlavorId}>
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  )
}
EOF
}

remove_style_preview_files() {
  rm -f packages/ui/src/lib/search-params.ts packages/ui/src/lib/search-params.test.ts

  cat > packages/ui/src/index.ts <<'EOF'
export * from './ui-matrix'
EOF
}

remove_style_preview_dependencies() {
  local package_json

  require_command perl

  for package_json in apps/web/package.json apps/www/package.json packages/ui/package.json; do
    perl -0pi -e 's/\n\s+"nuqs":\s+"[^"]+",?//g' "${package_json}"
  done
}

finalize_single_style_repo() {
  write_single_style_ui_matrix
  write_single_style_web_index_html
  write_single_style_web_router
  write_single_style_www_root_route
  remove_style_preview_files
  remove_style_preview_dependencies
}

apply_style_selection() {
  local flavor_name

  echo "Applying style selection: ${BOOTSTRAP_STYLE_FLAVOR}"

  for flavor_name in terra neutral vivid; do
    if [[ "${flavor_name}" == "${BOOTSTRAP_STYLE_FLAVOR}" ]]; then
      continue
    fi

    prune_style_flavor_markers "${flavor_name}"
  done

  finalize_single_style_repo
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
  apply_style_selection
  apply_web_variant_selection
  apply_feature_selection
  provision_infrastructure

  rm -- "$0"
  print_next_steps
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
