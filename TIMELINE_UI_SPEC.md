# Timeline UI Spec (Ctrl+E Tool Details)

## Goal
Provide a clear, scannable timeline of tool activity when tool details are expanded (Ctrl+E), without losing context lines emitted at tool start.

## Interaction
- Ctrl+E toggles tool details.
- When expanded, show raw tool lines **plus** a compact timeline summary for the group.
- When collapsed, show a single-line summary of tool activity.

## Display (Expanded)

### 1) Raw tool lines (existing)
These should continue to render exactly as emitted, including:
- Start/context lines (e.g., `Running TodoWrite...`)
- End/result lines (e.g., `OK TodoWrite completed in 0.0s`)

### 2) Timeline summary (new, appended)
Append a timeline block immediately after the raw tool group:
```
[Tools] Timeline (Ctrl+E to collapse)
12:03:41 generate_image_gemini ✅ 1.8s
12:03:42 analyze_image_gemini ✅ 0.6s
12:03:43 tavily_search ❌ 0.2s (401 Unauthorized)
```

## Data Requirements
- Each tool line should carry:
  - `ts` (timestamp when line was added)
  - `toolMeta` when available (tool name, event start/end, status, duration, preview)
- Timeline should use **tool_end** events only.
- If tool metadata is missing, parse from text fallback:
  - `>> tool` -> start
  - `<< tool` -> end
  - `OK tool: preview` -> ok end
  - `ERR tool failed: preview` -> error end
  - `tool completed in X` -> end with duration

## Formatting Rules
- Timestamp format: `HH:MM:SS` local time.
- Status indicator:
  - Unicode: `✅` for ok, `❌` for error
  - ASCII mode: `OK` / `ERR`
- Duration: append as ` 1.8s` if available.
- Error preview: append ` (snippet...)` truncated to ~80 chars.

## Collapsed Summary (unchanged)
Keep existing summary line, e.g.:
```
Tool details collapsed · 3 ran (generate_image_gemini, analyze_image_gemini +1) · Ctrl+E to expand
```

## Non-Goals
- Do not remove raw tool output when expanded.
- Do not change tool logging semantics.
- Do not add new tool calls or backfill timestamps from logs.

## Notes
- Preserve context lines to avoid losing tool start messages.
- If timeline causes duplication, consider hiding raw **end** lines while preserving **start/context** lines.
