#!/bin/bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

CASE_TMPDIR=""
CASE_REPO=""
CASE_FAKEBIN=""
CASE_STATE=""
CASE_LOG=""
CASE_STDOUT=""
CASE_STDERR=""
CASE_STATUS=0

assert_contains() {
  local file_path="$1"
  local expected="$2"

  if grep -Fq "$expected" "$file_path"; then
    return
  fi

  echo "Expected '$expected' in $file_path" >&2
  exit 1
}

assert_not_contains() {
  local file_path="$1"
  local unexpected="$2"

  if grep -Fq "$unexpected" "$file_path"; then
    echo "Did not expect '$unexpected' in $file_path" >&2
    exit 1
  fi
}

assert_matches() {
  local file_path="$1"
  local pattern="$2"

  if grep -Eq "$pattern" "$file_path"; then
    return
  fi

  echo "Expected pattern '$pattern' in $file_path" >&2
  exit 1
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local context="$3"

  if [[ "${expected}" == "${actual}" ]]; then
    return
  fi

  echo "Expected '${expected}' but got '${actual}' (${context})" >&2
  exit 1
}

assert_exists() {
  local path="$1"

  if [[ -e "${path}" ]]; then
    return
  fi

  echo "Expected ${path} to exist" >&2
  exit 1
}

assert_not_exists() {
  local path="$1"

  if [[ ! -e "${path}" ]]; then
    return
  fi

  echo "Expected ${path} to not exist" >&2
  exit 1
}

cleanup_case() {
  if [[ -n "${CASE_TMPDIR}" && -d "${CASE_TMPDIR}" ]]; then
    rm -rf "${CASE_TMPDIR}"
  fi

  CASE_TMPDIR=""
  CASE_REPO=""
  CASE_FAKEBIN=""
  CASE_STATE=""
  CASE_LOG=""
  CASE_STDOUT=""
  CASE_STDERR=""
  CASE_STATUS=0
}

trap cleanup_case EXIT

prepare_case() {
  local precreate_resources="$1"

  cleanup_case

  CASE_TMPDIR="$(mktemp -d)"
  CASE_REPO="${CASE_TMPDIR}/repo"
  CASE_FAKEBIN="${CASE_TMPDIR}/fakebin"
  CASE_STATE="${CASE_TMPDIR}/state"
  CASE_LOG="${CASE_STATE}/log.txt"
  CASE_STDOUT="${CASE_STATE}/stdout.txt"
  CASE_STDERR="${CASE_STATE}/stderr.txt"

  mkdir -p "${CASE_REPO}" "${CASE_FAKEBIN}" "${CASE_STATE}/buckets" "${CASE_STATE}/dbs"
  rsync -a --exclude .git --exclude node_modules "${repo_root}/" "${CASE_REPO}/"
  : > "${CASE_LOG}"
  : > "${CASE_STDOUT}"
  : > "${CASE_STDERR}"

  cat > "${CASE_FAKEBIN}/turso" <<'EOF'
#!/bin/bash
set -euo pipefail

state_dir="${FAKE_STATE_DIR:?missing FAKE_STATE_DIR}"
db_dir="${state_dir}/dbs"
log_file="${state_dir}/log.txt"

if [[ "${1:-}" == "auth" && "${2:-}" == "whoami" ]]; then
  echo "fake-user"
  exit 0
fi

if [[ "${1:-}" == "db" && "${2:-}" == "show" ]]; then
  database_name="${3:?missing database name}"
  if [[ ! -f "${db_dir}/${database_name}" ]]; then
    exit 1
  fi

  if [[ "${4:-}" == "--url" || "${5:-}" == "--url" ]]; then
    echo "libsql://${database_name}.turso.dev"
    exit 0
  fi

  echo "${database_name}"
  exit 0
fi

if [[ "${1:-}" == "db" && "${2:-}" == "create" ]]; then
  database_name="${3:?missing database name}"
  printf 'create-db:%s\n' "${database_name}" >> "${log_file}"
  touch "${db_dir}/${database_name}"
  exit 0
fi

if [[ "${1:-}" == "db" && "${2:-}" == "tokens" && "${3:-}" == "create" ]]; then
  database_name="${4:?missing database name}"
  printf 'create-token:%s\n' "${database_name}" >> "${log_file}"
  echo "token-for-${database_name}"
  exit 0
fi

echo "unexpected turso invocation: $*" >&2
exit 1
EOF

  cat > "${CASE_FAKEBIN}/npx" <<'EOF'
#!/bin/bash
set -euo pipefail

state_dir="${FAKE_STATE_DIR:?missing FAKE_STATE_DIR}"
bucket_dir="${state_dir}/buckets"
log_file="${state_dir}/log.txt"

if [[ "${1:-}" == "wrangler" && "${2:-}" == "whoami" ]]; then
  echo "fake-account"
  exit 0
fi

if [[ "${1:-}" == "wrangler" && "${2:-}" == "r2" && "${3:-}" == "bucket" && "${4:-}" == "list" ]]; then
  for bucket_path in "${bucket_dir}"/*; do
    if [[ -e "${bucket_path}" ]]; then
      bucket_name="$(basename "${bucket_path}")"
      echo "name:           ${bucket_name}"
      echo "creation_date:  2026-03-08T00:00:00.000Z"
      echo ""
    fi
  done
  exit 0
fi

if [[ "${1:-}" == "wrangler" && "${2:-}" == "r2" && "${3:-}" == "bucket" && "${4:-}" == "create" ]]; then
  bucket_name="${5:?missing bucket name}"
  printf 'create-bucket:%s\n' "${bucket_name}" >> "${log_file}"
  touch "${bucket_dir}/${bucket_name}"
  exit 0
fi

echo "unexpected npx invocation: $*" >&2
exit 1
EOF

  chmod +x "${CASE_FAKEBIN}/turso" "${CASE_FAKEBIN}/npx"

  if [[ "${precreate_resources}" == "1" ]]; then
    touch "${CASE_STATE}/buckets/oml-smoke-uploads"
    touch "${CASE_STATE}/buckets/oml-smoke-uploads-dev"
    touch "${CASE_STATE}/dbs/oml-smoke-db-prod"
    touch "${CASE_STATE}/dbs/oml-smoke-db-dev"
  fi
}

run_bootstrap() {
  set +e
  (
    cd "${CASE_REPO}"
    PATH="${CASE_FAKEBIN}:${PATH}" FAKE_STATE_DIR="${CASE_STATE}" ./bootstrap.sh "$@"
  ) >"${CASE_STDOUT}" 2>"${CASE_STDERR}"
  CASE_STATUS=$?
  set -e
}

run_selection_helper() {
  local input_text="$1"
  shift

  set +e
  (
    cd "${CASE_REPO}"
    source ./bootstrap.sh

    is_interactive_tty() {
      return 0
    }

    parse_args "$@"
    validate_service_name
    initialize_service_resource_names
    resolve_selection

    printf '%s' "${BOOTSTRAP_WEB_VARIANT}" > "${CASE_STATE}/resolved-web.txt"
    printf '%s' "${BOOTSTRAP_FEATURES_CSV}" > "${CASE_STATE}/resolved-features.txt"

    if has_feature "user-auth"; then
      printf '1' > "${CASE_STATE}/has-user-auth.txt"
    else
      printf '0' > "${CASE_STATE}/has-user-auth.txt"
    fi

    if has_feature "tracking"; then
      printf '1' > "${CASE_STATE}/has-tracking.txt"
    else
      printf '0' > "${CASE_STATE}/has-tracking.txt"
    fi

    if has_feature "missing"; then
      printf '1' > "${CASE_STATE}/has-missing.txt"
    else
      printf '0' > "${CASE_STATE}/has-missing.txt"
    fi
  ) >"${CASE_STDOUT}" 2>"${CASE_STDERR}" <<< "${input_text}"
  CASE_STATUS=$?
  set -e
}

assert_successful_bootstrap_case() {
  local case_name="$1"
  local precreate_resources="$2"
  local expected_web="$3"
  local expected_features="$4"
  shift 4

  prepare_case "${precreate_resources}"
  run_bootstrap "$@"

  assert_equals "0" "${CASE_STATUS}" "${case_name} exit status"
  assert_not_exists "${CASE_REPO}/bootstrap.sh"
  assert_contains "${CASE_REPO}/README.md" "oml-smoke"
  assert_contains "${CASE_REPO}/.dev.vars" "TURSO_DATABASE_URL=libsql://oml-smoke-db-dev.turso.dev"
  assert_contains "${CASE_REPO}/.dev.vars" "TURSO_AUTH_TOKEN=token-for-oml-smoke-db-dev"
  assert_contains "${CASE_STDOUT}" "Resolved selection: web=${expected_web}, features=${expected_features}"
  assert_contains "${CASE_STDOUT}" "Applying web variant selection (v1 no-op): ${expected_web}"
  assert_contains "${CASE_STDOUT}" "Applying feature selection (v1 no-op): ${expected_features}"

  if [[ "${precreate_resources}" == "1" ]]; then
    assert_not_contains "${CASE_LOG}" "create-bucket:"
    assert_not_contains "${CASE_LOG}" "create-db:"
  else
    assert_contains "${CASE_LOG}" "create-bucket:oml-smoke-uploads"
    assert_contains "${CASE_LOG}" "create-bucket:oml-smoke-uploads-dev"
    assert_contains "${CASE_LOG}" "create-db:oml-smoke-db-prod"
    assert_contains "${CASE_LOG}" "create-db:oml-smoke-db-dev"
  fi

  assert_contains "${CASE_LOG}" "create-token:oml-smoke-db-dev"
}

assert_failure_before_provisioning() {
  local case_name="$1"
  local expected_stderr="$2"
  shift 2

  prepare_case "0"
  run_bootstrap "$@"

  if [[ "${CASE_STATUS}" == "0" ]]; then
    echo "Expected bootstrap failure (${case_name})" >&2
    exit 1
  fi

  assert_contains "${CASE_STDERR}" "${expected_stderr}"
  assert_exists "${CASE_REPO}/bootstrap.sh"
  assert_contains "${CASE_REPO}/README.md" "__SERVICE_NAME__"
  assert_not_exists "${CASE_REPO}/.dev.vars"
  assert_not_contains "${CASE_LOG}" "create-bucket:"
  assert_not_contains "${CASE_LOG}" "create-db:"
  assert_not_contains "${CASE_LOG}" "create-token:"
}

echo "Running bootstrap smoke: default bootstrap with fresh infra"
assert_successful_bootstrap_case "fresh infra defaults" "0" "b2b" "none" smoke

echo "Running bootstrap smoke: default bootstrap with existing infra"
assert_successful_bootstrap_case "existing infra defaults" "1" "b2b" "none" smoke

echo "Running bootstrap smoke: explicit web/features flags"
assert_successful_bootstrap_case "explicit selection flags" "0" "b2b" "user-auth,tracking" \
  smoke --web b2b --features user-auth,tracking

echo "Running bootstrap smoke: normalized features order"
assert_successful_bootstrap_case "feature normalization" "0" "b2b" "user-auth,tracking" \
  smoke --features tracking,user-auth,tracking

echo "Running bootstrap smoke: explicit none features"
assert_successful_bootstrap_case "features none" "0" "b2c" "none" \
  smoke --web b2c --features none

echo "Running bootstrap smoke: none mixed with feature fails"
assert_failure_before_provisioning "none with feature" "'none' cannot be combined with other features." \
  smoke --features none,user-auth

echo "Running bootstrap smoke: unknown feature fails"
assert_failure_before_provisioning "unknown feature" "invalid feature 'search'" \
  smoke --features search

echo "Running bootstrap smoke: unknown option fails"
assert_failure_before_provisioning "unknown option" "unknown option '--unknown'" \
  smoke --unknown

echo "Running bootstrap smoke: unknown web fails"
assert_failure_before_provisioning "unknown web" "invalid web variant 'b2x'" \
  smoke --web b2x

echo "Running bootstrap smoke: missing service_name fails"
prepare_case "0"
run_bootstrap
if [[ "${CASE_STATUS}" == "0" ]]; then
  echo "Expected bootstrap failure for missing service_name" >&2
  exit 1
fi
assert_contains "${CASE_STDERR}" "Usage: ./bootstrap.sh <service_name> [--web b2b|b2c] [--features user-auth,tracking|none]"
assert_exists "${CASE_REPO}/bootstrap.sh"
assert_contains "${CASE_REPO}/README.md" "__SERVICE_NAME__"
assert_not_exists "${CASE_REPO}/.dev.vars"

echo "Running bootstrap smoke: extra positional fails"
prepare_case "0"
run_bootstrap smoke extra
if [[ "${CASE_STATUS}" == "0" ]]; then
  echo "Expected bootstrap failure for extra positional" >&2
  exit 1
fi
assert_contains "${CASE_STDERR}" "Usage: ./bootstrap.sh <service_name> [--web b2b|b2c] [--features user-auth,tracking|none]"
assert_exists "${CASE_REPO}/bootstrap.sh"
assert_contains "${CASE_REPO}/README.md" "__SERVICE_NAME__"
assert_not_exists "${CASE_REPO}/.dev.vars"
assert_not_contains "${CASE_LOG}" "create-bucket:"
assert_not_contains "${CASE_LOG}" "create-db:"

echo "Running bootstrap smoke: interactive prompt order"
prepare_case "0"
run_selection_helper $'2\ntracking,user-auth,tracking\n' smoke
assert_equals "0" "${CASE_STATUS}" "interactive prompt order exit status"
assert_matches "${CASE_STDERR}" 'Select web variant.*Select features'
assert_equals "b2c" "$(cat "${CASE_STATE}/resolved-web.txt")" "interactive resolved web"
assert_equals "user-auth,tracking" "$(cat "${CASE_STATE}/resolved-features.txt")" "interactive resolved features"
assert_equals "1" "$(cat "${CASE_STATE}/has-user-auth.txt")" "has_feature user-auth"
assert_equals "1" "$(cat "${CASE_STATE}/has-tracking.txt")" "has_feature tracking"
assert_equals "0" "$(cat "${CASE_STATE}/has-missing.txt")" "has_feature missing"
assert_contains "${CASE_STDOUT}" "Resolved selection: web=b2c, features=user-auth,tracking"

echo "Running bootstrap smoke: interactive partial prompt only asks missing axis"
prepare_case "0"
run_selection_helper $'\n' smoke --web b2c
assert_equals "0" "${CASE_STATUS}" "interactive partial prompt exit status"
assert_not_contains "${CASE_STDERR}" "Select web variant"
assert_contains "${CASE_STDERR}" "Select features [user-auth,tracking|none] (default: none):"
assert_equals "b2c" "$(cat "${CASE_STATE}/resolved-web.txt")" "interactive partial resolved web"
assert_equals "" "$(cat "${CASE_STATE}/resolved-features.txt")" "interactive partial resolved features"
assert_contains "${CASE_STDOUT}" "Resolved selection: web=b2c, features=none"

echo "bootstrap smoke passed"
