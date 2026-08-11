#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${BUILD_SHA:-}" ]]; then
  if [[ -n "${GITHUB_SHA:-}" ]]; then
    export BUILD_SHA="$GITHUB_SHA"
  elif [[ -n "${CI_COMMIT_SHA:-}" ]]; then
    export BUILD_SHA="$CI_COMMIT_SHA"
  else
    export BUILD_SHA="local"
  fi
fi

if [[ -z "${BUILD_TIME:-}" ]]; then
  export BUILD_TIME="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
fi

if [[ ( "${CI:-}" == "true" || "${CI:-}" == "1" ) && "$BUILD_SHA" == "local" ]]; then
  echo "CI 构建必须提供 BUILD_SHA、GITHUB_SHA 或 CI_COMMIT_SHA。" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未找到 pnpm；请在 CI 运行器中预装 Node.js 20+ 与 pnpm 8+。" >&2
  exit 1
fi

node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm verify
node scripts/write-release-metadata.mjs "${RELEASE_METADATA_PATH:-.release/release-metadata.json}"
