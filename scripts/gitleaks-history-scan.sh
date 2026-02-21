#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GITLEAKS_BIN="$ROOT_DIR/tools/bin/gitleaks"
REPORT_PATH="${1:-$ROOT_DIR/tools/gitleaks-history-report.json}"

if [[ ! -x "$GITLEAKS_BIN" ]]; then
  echo "gitleaks not found at $GITLEAKS_BIN" >&2
  echo "Run: scripts/install-tools.sh" >&2
  exit 1
fi

"$GITLEAKS_BIN" git \
  --no-banner \
  --redact \
  --report-format json \
  --report-path "$REPORT_PATH" \
  "$ROOT_DIR"

echo "Report written to: $REPORT_PATH"
