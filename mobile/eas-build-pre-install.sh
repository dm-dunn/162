#!/usr/bin/env bash
# EAS pre-install hook — runs before `npm ci` on the build VM.
# The EAS Mac build orchestrator clones the repo as a privileged process, which can
# leave the app subdirectory owned by a different user than the one that runs npm.
# This causes `mkdir node_modules` to fail with EACCES. We fix that here.

set -eo pipefail

echo "▶ eas-build-pre-install: fixing directory write permissions..."

# Try unprivileged chmod first; fall back to sudo if available.
chmod +w . 2>/dev/null \
  || sudo chmod +w . 2>/dev/null \
  || true

echo "✓ Done — proceeding to npm ci."
