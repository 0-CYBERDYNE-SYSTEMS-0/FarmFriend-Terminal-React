#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="${FF_WORKSPACE_DIR:-}"
if [[ -z "${WORKSPACE_DIR}" ]]; then
  if [[ -d "$HOME/fft_box" ]]; then
    WORKSPACE_DIR="$HOME/fft_box"
  elif [[ -d "./ff-terminal-workspace" ]]; then
    WORKSPACE_DIR="$(pwd)/ff-terminal-workspace"
  elif [[ -d "$HOME/ff-terminal-workspace" ]]; then
    WORKSPACE_DIR="$HOME/ff-terminal-workspace"
  else
    WORKSPACE_DIR="$(pwd)"
  fi
fi

SESSIONS_DIR="${WORKSPACE_DIR}/sessions"
MAIN_PATH="${SESSIONS_DIR}/main.json"

if [[ ! -d "${SESSIONS_DIR}" ]]; then
  echo "No sessions directory found at: ${SESSIONS_DIR}"
  exit 0
fi

mapfile -t SESSION_FILES < <(find "${SESSIONS_DIR}" -maxdepth 1 -type f -name "*.json" ! -name "main.json" ! -name "*_archive_*.json" | sort)

if [[ ${#SESSION_FILES[@]} -eq 0 ]]; then
  echo "No session files to migrate."
  exit 0
fi

echo "Found ${#SESSION_FILES[@]} session files:"
for f in "${SESSION_FILES[@]}"; do
  echo " - $(basename "${f}")"
done

read -r -p "Merge these sessions into main.json? (y/N) " RESP
RESP="${RESP,,}"
if [[ "${RESP}" != "y" && "${RESP}" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

export MAIN_PATH
export SESSION_LIST
SESSION_LIST="$(printf "%s\n" "${SESSION_FILES[@]}")"

node <<'NODE'
const fs = require("fs");
const path = require("path");

const mainPath = process.env.MAIN_PATH;
const sessionList = (process.env.SESSION_LIST || "").split("\n").filter(Boolean);

const now = new Date().toISOString();
let main;
if (fs.existsSync(mainPath)) {
  try {
    main = JSON.parse(fs.readFileSync(mainPath, "utf8"));
  } catch {
    main = null;
  }
}
if (!main) {
  main = { version: 1, session_id: "main", created_at: now, updated_at: now, conversation: [], stats: { totalMessages: 0, totalTokens: 0, createdAt: now, lastActiveAt: now, archivedCount: 0 } };
}

for (const file of sessionList) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Array.isArray(data.conversation)) {
      main.conversation.push(...data.conversation);
    }
  } catch {
    // skip unreadable files
  }
}

main.conversation.sort((a, b) => {
  const ta = Date.parse(a.created_at || "");
  const tb = Date.parse(b.created_at || "");
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
  return 0;
});

const estimateTokens = (text) => Math.max(1, Math.ceil(String(text || "").length / 4));
const totalTokens = main.conversation.reduce((sum, m) => sum + estimateTokens(m.content), 0);
main.updated_at = now;
main.stats = main.stats || {};
main.stats.totalMessages = main.conversation.length;
main.stats.totalTokens = totalTokens;
main.stats.createdAt = main.stats.createdAt || main.created_at || now;
main.stats.lastActiveAt = now;

fs.mkdirSync(path.dirname(mainPath), { recursive: true });
fs.writeFileSync(mainPath, JSON.stringify(main, null, 2) + "\n", "utf8");
NODE

echo "Merged sessions into: ${MAIN_PATH}"

read -r -p "Archive migrated sessions? (Y/n) " ARCHIVE
ARCHIVE="${ARCHIVE,,}"
if [[ "${ARCHIVE}" != "n" && "${ARCHIVE}" != "no" ]]; then
  TS="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
  for f in "${SESSION_FILES[@]}"; do
    base="$(basename "${f}" .json)"
    mv "${f}" "${SESSIONS_DIR}/${base}_archive_${TS}.json"
  done
  echo "Archived original session files."
fi

echo "Tip: run /session reset summarize or manage_memory extract to condense memory if needed."
