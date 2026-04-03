#!/usr/bin/env bash
# EAS pre-install hook — found by EAS via eas.json location (mobile/).
# Fixes directory ownership so yarn can create node_modules.
# Uses sudo (available passwordless on EAS Mac VMs).

set -eo pipefail

echo "▶ eas-build-pre-install (mobile): fixing ownership on build tree..."
# Fix the repo root (one level up from mobile/) AND mobile/ itself
sudo chown -R "$(id -un)":"$(id -gn)" .. 2>/dev/null || true
sudo chown -R "$(id -un)":"$(id -gn)" .  2>/dev/null || true
chmod -R u+w .. 2>/dev/null || true
chmod -R u+w .  2>/dev/null || true
echo "✓ Done."
