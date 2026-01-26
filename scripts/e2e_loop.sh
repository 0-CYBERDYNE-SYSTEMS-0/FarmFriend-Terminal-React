#!/usr/bin/env bash
# Simple end-to-end loop runner for ff-terminal.
# Usage:
#   ./scripts/e2e_loop.sh "profile-name" "session_id" <<'EOF'
#   prompt one
#   prompt two
#   EOF
#
# - profile-name: name of profile to use (as configured via ff-terminal profile setup)
# - session_id: reused across prompts to preserve context (or pass "auto" for a new random session)
# - reads prompts from stdin, one per line.

set -euo pipefail

# macOS default /bin/bash lacks readarray; implement portable read loop.
PROMPTS=()
while IFS= read -r line; do
  PROMPTS+=("$line")
done

PROFILE="${1:-default}"
SESSION_IN="${2:-auto}"

if [ "${#PROMPTS[@]}" -eq 0 ]; then
  echo "No prompts provided on stdin." >&2
  exit 1
fi

SESSION_ID="$SESSION_IN"
if [ "$SESSION_ID" = "auto" ]; then
  # Generate a lightweight session id without pulling in TS utils
  r1=$(( (RANDOM + 10000) % 100000 ))
  r2=$(( (RANDOM + 20000) % 100000 ))
  SESSION_ID="session_${r1}_${r2}"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

WORKSPACE_DIR="${FF_WORKSPACE_DIR:-$HOME/fft_box}"
echo "Running ${#PROMPTS[@]} prompts using profile=${PROFILE}, session=${SESSION_ID}"

for prompt in "${PROMPTS[@]}"; do
  [ -z "$prompt" ] && continue
  echo "----------------------------------------------------------------"
  echo "Prompt: $prompt"
  CMD=(node "${ROOT_DIR}/dist/bin/ff-terminal.js" run)
  if [ "${PROFILE}" != "env" ]; then
    CMD+=("--profile" "${PROFILE}")
  fi
  CMD+=("--session" "${SESSION_ID}" "--prompt" "${prompt}" "--headless")
  NODE_OPTIONS="--max-old-space-size=4096" "${CMD[@]}"
done

echo "----------------------------------------------------------------"
echo "Done. Session logs (truth source): ${WORKSPACE_DIR}/logs/sessions/session_${SESSION_ID}.jsonl"
