# Agents

## End-to-end agent loop (direct runtime test)

Use the e2e loop script to call the **agent runtime directly** (headless), bypassing the UI. This is the most reliable way to validate profiles, credentials, tool wiring, and the model gateway end-to-end.

### Requirements
- Build output present: `npm run build`
- A configured profile (unless using `env`) via `ff-terminal profile setup`

### Usage
```bash
# From repo root
./scripts/e2e_loop.sh "<profile-name>" auto <<'EOT'
Hello
Summarize this repo
EOT
```

### Arguments
- `profile-name`: profile to use; pass `env` to rely on environment variables instead of stored profiles.
- `session_id`: reuse a session across prompts (or `auto` for a new session ID).

### Notes
- The script invokes `dist/bin/ff-terminal.js run --headless` and writes logs under `~/ff-terminal-workspace`.
- If using `env`, set provider/model/keys in the environment before running.
- If the repo was moved, re-run `scripts/install-cli.sh` to update the `ff-terminal` launcher.

### Log location
- Truth source: `~/ff-terminal-workspace/logs/sessions/session_<session_id>.jsonl`

## Reference repository snapshot
- `clawdbot-clawdbot.txt` is the full Clawdbot GitHub repository snapshot (entire codebase + file tree) captured in a single large file for reference.

## Operational notes
- iMessage pairing replies are disabled by setting `channels.imessage.dmPolicy` to `disabled` in `~/.clawdbot/clawdbot.json` to prevent sending pairing requests.

## Agent readiness report
- See `AGENT_READINESS_REPORT.md` for the latest Factory readiness summary.
