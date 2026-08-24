#!/usr/bin/env bash

set -Eeuo pipefail

DEPLOY_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_BACKEND_DIR="$(cd "${DEPLOY_SCRIPT_DIR}/.." && pwd)"
DEPLOY_REPOSITORY_DIR="$(cd "${DEPLOY_BACKEND_DIR}/.." && pwd)"
DEPLOY_PROJECT_REF_FILE="${DEPLOY_BACKEND_DIR}/supabase/.temp/project-ref"
DEPLOY_PROFILE="${SUPABASE_PROFILE:-}"
DEPLOY_PROFILE_ARGS=()
if [[ -n "${DEPLOY_PROFILE}" ]]; then
  DEPLOY_PROFILE_ARGS=(--profile "${DEPLOY_PROFILE}")
fi
DEPLOY_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
DEPLOY_ASSUME_YES=false
DEPLOY_RUN_CHECKS=true
DEPLOY_PUSH_CONFIG=true
DEPLOY_PUSH_FUNCTIONS=true

usage() {
  echo "Usage: npm run deploy:supabase -- [options]"
  echo ""
  echo "Options:"
  echo "  --yes             Skip the interactive production confirmation (for CI)."
  echo "  --skip-checks     Skip backend typecheck and tests."
  echo "  --skip-config     Do not push Supabase project/Auth configuration."
  echo "  --skip-functions  Do not deploy Edge Functions."
  echo "  --help             Show this help."
}

# Deploy every pending Wine & Chapters Supabase backend change.
#
# Usage:
#   npm run deploy:supabase
#   npm run deploy:supabase -- --yes
#
# Options:
#   --yes             Skip the interactive production confirmation (for CI).
#   --skip-checks     Skip backend typecheck and tests.
#   --skip-config     Do not push Supabase project/Auth configuration.
#   --skip-functions  Do not deploy Edge Functions.
#   --help            Show this help.
#
# Environment:
#   SUPABASE_PROFILE      Optional named CLI profile. Defaults to the active login.
#   SUPABASE_PROJECT_REF  Override the linked project reference.
#   SUPABASE_ACCESS_TOKEN Recommended for non-interactive CI authentication.

while (($#)); do
  case "$1" in
    --yes) DEPLOY_ASSUME_YES=true ;;
    --skip-checks) DEPLOY_RUN_CHECKS=false ;;
    --skip-config) DEPLOY_PUSH_CONFIG=false ;;
    --skip-functions) DEPLOY_PUSH_FUNCTIONS=false ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

trap 'echo "Supabase deployment failed at line ${LINENO}." >&2' ERR

command -v supabase >/dev/null 2>&1 || {
  echo "Supabase CLI is required. Run npm install from ${DEPLOY_REPOSITORY_DIR}." >&2
  exit 1
}

if [[ -z "${DEPLOY_PROJECT_REF}" ]]; then
  [[ -s "${DEPLOY_PROJECT_REF_FILE}" ]] || {
    echo "No linked Supabase project found. Run supabase link first." >&2
    exit 1
  }
  DEPLOY_PROJECT_REF="$(tr -d '[:space:]' < "${DEPLOY_PROJECT_REF_FILE}")"
fi

[[ "${DEPLOY_PROJECT_REF}" =~ ^[a-z0-9]{20}$ ]] || {
  echo "Invalid Supabase project reference: ${DEPLOY_PROJECT_REF}" >&2
  exit 1
}

cd "${DEPLOY_BACKEND_DIR}"

echo "Target Supabase project: ${DEPLOY_PROJECT_REF}"
echo "CLI profile: ${DEPLOY_PROFILE:-active login}"
supabase projects list "${DEPLOY_PROFILE_ARGS[@]}" --output json >/dev/null

if [[ "${DEPLOY_RUN_CHECKS}" == true ]]; then
  echo "Running backend typecheck and tests..."
  npm run typecheck
  npm test
fi

echo "Comparing migration history..."
supabase migration list --linked "${DEPLOY_PROFILE_ARGS[@]}"

if [[ "${DEPLOY_ASSUME_YES}" != true ]]; then
  if [[ ! -t 0 ]]; then
    echo "Refusing a non-interactive deployment without --yes." >&2
    exit 1
  fi
  read -r -p "Deploy migrations, configuration, and functions to ${DEPLOY_PROJECT_REF}? [y/N] " DEPLOY_CONFIRMATION
  [[ "${DEPLOY_CONFIRMATION}" =~ ^[Yy]$ ]] || {
    echo "Deployment cancelled."
    exit 0
  }
fi

echo "Applying pending migrations..."
supabase migration up --linked --include-all "${DEPLOY_PROFILE_ARGS[@]}"

if [[ "${DEPLOY_PUSH_CONFIG}" == true ]]; then
  echo "Pushing Supabase configuration and Auth email templates..."
  supabase config push --project-ref "${DEPLOY_PROJECT_REF}" "${DEPLOY_PROFILE_ARGS[@]}"
fi

if [[ "${DEPLOY_PUSH_FUNCTIONS}" == true ]]; then
  echo "Deploying all Edge Functions..."
  supabase functions deploy --project-ref "${DEPLOY_PROJECT_REF}" "${DEPLOY_PROFILE_ARGS[@]}"
fi

echo "Verifying remote migration history..."
supabase migration list --linked "${DEPLOY_PROFILE_ARGS[@]}"

if [[ "${DEPLOY_PUSH_FUNCTIONS}" == true ]]; then
  echo "Verifying remote Edge Functions..."
  supabase functions list --project-ref "${DEPLOY_PROJECT_REF}" "${DEPLOY_PROFILE_ARGS[@]}"
fi

echo "Supabase backend deployment completed successfully."
