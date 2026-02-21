#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="$ROOT_DIR/tools/bin"
mkdir -p "$BIN_DIR"

install_gitleaks() {
  if command -v gitleaks >/dev/null 2>&1; then
    ln -sf "$(command -v gitleaks)" "$BIN_DIR/gitleaks"
    echo "Linked system gitleaks -> $BIN_DIR/gitleaks"
    return 0
  fi

  if command -v go >/dev/null 2>&1; then
    echo "System gitleaks not found. Trying 'go install'..."
    if GOBIN="$BIN_DIR" go install github.com/gitleaks/gitleaks/v8@latest; then
      echo "Installed gitleaks to $BIN_DIR/gitleaks"
      return 0
    fi
    echo "go install failed (likely restricted network)." >&2
  fi

  cat >&2 <<MSG
Unable to install gitleaks automatically in this environment.

Tried:
  - Linking an existing system binary
  - go install github.com/gitleaks/gitleaks/v8@latest

If your environment has outbound access, rerun:
  scripts/install-tools.sh
MSG
  return 1
}

install_gitleaks
