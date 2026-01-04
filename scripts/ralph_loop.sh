#!/usr/bin/env bash
# Ralph-style autonomy loop runner for ff-terminal (Phase 1 orchestrator).
# Usage:
#   ./scripts/ralph_loop.sh [--profile <name>] --prompt-file <path> [--tasks-file <path>] [--completion-promise <text>]
#                           [--max-loops <n>] [--stall-limit <n>] [--sleep-ms <n>] [--oracle <mode>]
#
# Notes:
# - Requires build output: npm run build
# - Wraps the built CLI: dist/bin/ff-terminal.js autonomy

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "${ROOT_DIR}/dist/bin/ff-terminal.js" autonomy "$@"
