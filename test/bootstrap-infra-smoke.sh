#!/bin/bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

assert_contains() {
  local file_path="$1"
  local expected="$2"

  if grep -Fq "$expected" "$file_path"; then
    return
  fi

  echo "Expected '$expected' in $file_path" >&2
  exit 1
}

run_case() {
  local case_name="$1"
  local precreate_resources="$2"
  local tmpdir
  local repo_copy
  local fakebin
  local state_dir
  local log_file

  tmpdir="$(mktemp -d)"
  repo_copy="${tmpdir}/repo"
  fakebin="${tmpdir}/fakebin"
  state_dir="${tmpdir}/state"
  log_file="${state_dir}/log.txt"

  cleanup() {
    rm -rf "$tmpdir"
  }

  trap cleanup RETURN

  mkdir -p "$repo_copy" "$fakebin" "${state_dir}/buckets" "${state_dir}/dbs"
  rsync -a --exclude .git --exclude node_modules "${repo_root}/" "${repo_copy}/"
  : > "$log_file"

  cat > "${fakebin}/turso" <<'EOF'
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

  cat > "${fakebin}/npx" <<'EOF'
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

  chmod +x "${fakebin}/turso" "${fakebin}/npx"

  if [[ "${precreate_resources}" == "1" ]]; then
    touch "${state_dir}/buckets/oml-smoke-uploads"
    touch "${state_dir}/buckets/oml-smoke-uploads-dev"
    touch "${state_dir}/dbs/oml-smoke-db-prod"
    touch "${state_dir}/dbs/oml-smoke-db-dev"
  fi

  (
    cd "${repo_copy}"
    PATH="${fakebin}:${PATH}" FAKE_STATE_DIR="${state_dir}" ./bootstrap.sh smoke
  )

  if [[ -e "${repo_copy}/bootstrap.sh" ]]; then
    echo "bootstrap.sh should remove itself on success (${case_name})" >&2
    exit 1
  fi

  assert_contains "${repo_copy}/README.md" "oml-smoke"
  assert_contains "${repo_copy}/.dev.vars" "TURSO_DATABASE_URL=libsql://oml-smoke-db-dev.turso.dev"
  assert_contains "${repo_copy}/.dev.vars" "TURSO_AUTH_TOKEN=token-for-oml-smoke-db-dev"

  if [[ "${precreate_resources}" == "1" ]]; then
    if grep -Eq '^create-(bucket|db):' "${log_file}"; then
      echo "bootstrap should not recreate existing infra (${case_name})" >&2
      cat "${log_file}" >&2
      exit 1
    fi
  else
    assert_contains "${log_file}" "create-bucket:oml-smoke-uploads"
    assert_contains "${log_file}" "create-bucket:oml-smoke-uploads-dev"
    assert_contains "${log_file}" "create-db:oml-smoke-db-prod"
    assert_contains "${log_file}" "create-db:oml-smoke-db-dev"
  fi

  assert_contains "${log_file}" "create-token:oml-smoke-db-dev"

  trap - RETURN
  cleanup
}

run_case "fresh infra" "0"
run_case "existing infra" "1"
