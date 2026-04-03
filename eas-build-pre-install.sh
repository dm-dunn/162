#!/usr/bin/env bash
# EAS pre-install hook — runs from the repo root before yarn installs dependencies.
#
# WHY THIS EXISTS:
# The EAS Mac build orchestrator clones the repo as a privileged process, leaving
# /Users/expo/workingdir/build/ owned by a user other than the `expo` account that
# runs yarn. This causes EACCES on any mkdir inside the build tree (node_modules,
# mobile/node_modules, etc.). We use sudo (available passwordless on EAS VMs) to
# restore ownership to the current user before yarn runs.

set -eo pipefail

echo "▶ eas-build-pre-install: restoring build directory ownership..."
sudo chown -R "$(id -un)":"$(id -gn)" . 2>/dev/null || chown -R "$(id -un)" . 2>/dev/null || true
chmod -R u+w . 2>/dev/null || true
echo "✓ Done — proceeding to yarn install."
