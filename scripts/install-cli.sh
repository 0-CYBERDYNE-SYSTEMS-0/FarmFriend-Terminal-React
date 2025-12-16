#!/usr/bin/env bash
set -euo pipefail

# Installs a `ff-terminal` launcher into ~/.local/bin that points at this repo's TS implementation.
# Keeps any existing launcher as a backup (e.g., the Python/Poetry version).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FFTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

TARGET_DIR="${HOME}/.local/bin"
TARGET="${TARGET_DIR}/ff-terminal"

mkdir -p "${TARGET_DIR}"

if [[ -f "${TARGET}" ]]; then
  if grep -q "Poetry could not find a pyproject.toml" "${TARGET}" 2>/dev/null || grep -q "poetry run python" "${TARGET}" 2>/dev/null; then
    mv "${TARGET}" "${TARGET}.python.bak.$(date +%Y%m%d%H%M%S)"
  else
    mv "${TARGET}" "${TARGET}.bak.$(date +%Y%m%d%H%M%S)"
  fi
fi

cat > "${TARGET}" <<EOF
#!/usr/bin/env bash
set -euo pipefail

FFTS_DIR="${FFTS_DIR}"

# Prefer the built JS entrypoint when available (quietest).
if [[ -f "\${FFTS_DIR}/dist/bin/ff-terminal.js" ]]; then
  exec node "\${FFTS_DIR}/dist/bin/ff-terminal.js" "\$@"
fi

# Fallback to dev runner (requires deps installed in ff-terminal-ts/).
exec npm -C "\${FFTS_DIR}" run -s dev -- "\$@"
EOF

chmod +x "${TARGET}"

echo "Installed: ${TARGET}"
echo "If \`ff-terminal\` still resolves to a different binary, run: hash -r"
