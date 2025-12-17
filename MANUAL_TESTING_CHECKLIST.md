# Manual Testing Checklist for FF-Terminal CLI

**Purpose:** Interactive testing of all commands and wizards
**Created:** 2025-12-17
**Companion to:** CLI_COMMAND_REVIEW.md

---

## Pre-Test Setup

### 1. Build the Project
```bash
npm run build
```
**Expected:** ✅ No TypeScript errors

### 2. Start the Daemon (Terminal 1)
```bash
npm run dev:daemon
```
**Expected:**
- ✅ Daemon starts on port 28888
- ✅ "WebSocket server listening on ws://127.0.0.1:28888"

### 3. Start the UI (Terminal 2)
```bash
npm run dev:cli
```
**Expected:**
- ✅ UI connects to daemon
- ✅ Banner displays (FF-Terminal v3.0 box)
- ✅ "connected (daemon...)" message
- ✅ Prompt: `› ` with footer showing keybindings

---

## Phase 1: Basic Display Commands

### Test 1: `/help`
1. Type `/help` and press Enter
2. **Expected:**
   - ✅ All commands listed (17 commands)
   - ✅ Keyboard shortcuts shown (Shift+Tab)
   - ✅ Clean formatting
3. **Issues to check:**
   - Verify "/wizard supports subcommands" note exists (OR should be added)
   - Check if "/mounts" description clarifies read-only vs config

### Test 2: `/tools`
1. Type `/tools` and press Enter
2. **Expected:**
   - ✅ Tool count shown: "Tools (XX):"
   - ✅ Alphabetically sorted list
   - ✅ Descriptions for each tool
   - ✅ Common tools visible: read_file, write_file, run_command, search_code, etc.

### Test 3: `/agents`
1. Type `/agents` and press Enter
2. **Expected:**
   - ✅ Provider shown (e.g., "openrouter")
   - ✅ Main model shown
   - ✅ Subagent model shown (or "(inherit main)")
   - ✅ Oracle status (enabled if OPENROUTER_API_KEY present, else "missing OPENROUTER_API_KEY")

### Test 4: `/mounts`
1. Type `/mounts` and press Enter
2. **Expected:**
   - ✅ "Mounts (read-only):" header
   - ✅ `claude` mount with status (enabled/disabled)
   - ✅ `factory` mount with status (enabled/disabled)
   - ✅ Paths shown: "reads ~/.claude/skills + <repo>/.claude/skills" for claude
3. **Issues to check:**
   - Is it clear this is READ-ONLY status?
   - Do users know to use `/wizard mounts` to toggle?

### Test 5: `/theme` (or `/colors`)
1. Type `/theme` and press Enter
2. **Expected:**
   - ✅ "Theme preview" header
   - ✅ Color samples for all line types:
     - system/meta (gray)
     - user (cyanBright+bold)
     - assistant (whiteBright+bold)
     - thinking (magenta)
     - tool (yellow)
     - error (red)
   - ✅ Spinner appears for ~1 second
3. **Verify:** Colors render correctly in your terminal

### Test 6: `/clear`
1. Run a few commands to populate transcript
2. Type `/clear` and press Enter
3. **Expected:**
   - ✅ Transcript clears completely
   - ✅ Only banner and prompt remain

---

## Phase 2: Mode Commands

### Test 7: `/mode` (no arguments)
1. Type `/mode` and press Enter
2. **Expected:**
   - ✅ Shows current mode (default: "auto")
   - ✅ Message: "Mode: auto"

### Test 8: `/mode auto`
1. Type `/mode auto` and press Enter
2. **Expected:**
   - ✅ Message: "Mode: auto"
   - ✅ Footer shows "mode=auto"

### Test 9: `/mode confirm`
1. Type `/mode confirm` and press Enter
2. **Expected:**
   - ✅ Message: "Mode: confirm"
   - ✅ Footer shows "mode=confirm"
3. **Note:** Confirm behavior not yet implemented in daemon

### Test 10: `/mode read_only`
1. Type `/mode read_only` and press Enter
2. **Expected:**
   - ✅ Message: "Mode: read_only"
   - ✅ Footer shows "mode=read_only"

### Test 11: `/mode planning`
1. Type `/mode planning` and press Enter
2. **Expected:**
   - ✅ Message: "Mode: planning"
   - ✅ Footer shows "mode=planning"

### Test 12: `/planning` (alias)
1. Type `/planning` and press Enter
2. **Expected:**
   - ✅ Message: "Mode: planning"
   - ✅ Identical to `/mode planning`

### Test 13: `/mode invalid`
1. Type `/mode xyz` and press Enter
2. **Expected:**
   - ✅ Error message: "Invalid mode: xyz (use auto|confirm|read_only|planning)"
   - ✅ Red text (error color)

### Test 14: Shift+Tab (mode cycling)
1. Press Shift+Tab multiple times
2. **Expected:**
   - ✅ Cycles through: auto → confirm → read_only → planning → auto
   - ✅ Footer updates each time
   - ✅ Transcript shows "Mode: {name}" for each

---

## Phase 3: Special Commands

### Test 15: `//escape`
1. Type `//hello world` and press Enter
2. **Expected:**
   - ✅ Prompt echoes: `/hello world` (single slash)
   - ✅ Sent to LLM as literal prompt
3. **Verify:** LLM receives `/hello world` not `//hello world`

### Test 16: `/quit`
1. Type `/quit` and press Enter
2. **Expected:**
   - ✅ UI exits cleanly
   - ✅ Returns to shell prompt
3. **Restart UI for next tests**

### Test 17: `/exit`
1. Type `/exit` and press Enter
2. **Expected:**
   - ✅ UI exits cleanly (same as `/quit`)
3. **Restart UI for next tests**

### Test 18: `/init`
1. Type `/init` and press Enter
2. **Expected:**
   - ✅ Message: "Running init…"
   - ✅ LLM turn starts (spinner appears)
   - ✅ LLM provides:
     - Brief repo summary
     - Recommended commands
     - Asks for missing config (if any)
3. **Verify:** Response is concise and relevant

### Test 19: `/init-project` (no args)
1. Type `/init-project` and press Enter
2. **Expected:**
   - ✅ Enters init_project wizard mode
   - ✅ Help text: "Type to filter • ↑/↓ select • Enter load • Esc quit"
   - ✅ Shows workspace path
   - ✅ Lists projects or "No projects found"
3. Press Esc to exit
4. **Expected:** ✅ Returns to chat mode

### Test 20: `/init-project` (with path) - Create Test Project First

**Setup:**
```bash
mkdir -p ~/.config/ff-terminal/projects/test-cli-project
echo "# Test CLI Project" > ~/.config/ff-terminal/projects/test-cli-project/PROJECT.md
echo "This is a test project for CLI verification." >> ~/.config/ff-terminal/projects/test-cli-project/PROJECT.md
```

1. Type `/init-project ~/.config/ff-terminal/projects/test-cli-project` and press Enter
2. **Expected:**
   - ✅ Message: "✓ Loaded 1 project context files"
   - ✅ Shows project name
   - ✅ LLM turn starts
   - ✅ LLM summarizes project context

3. **Cleanup:**
```bash
rm -rf ~/.config/ff-terminal/projects/test-cli-project
```

---

## Phase 4: Not Implemented Commands

### Test 21: `/commands`
1. Type `/commands` and press Enter
2. **Expected:**
   - ✅ Message: "Custom commands are not implemented in the TS Ink UI yet."
   - ✅ Gray text (system message)

### Test 22: `/command`
1. Type `/command` and press Enter
2. **Expected:**
   - ✅ Message: "Custom command management is not implemented in the TS Ink UI yet (Python TUI supports /command create/list/edit/delete/show)."
   - ✅ References Python TUI

### Test 23: Unknown command
1. Type `/foobar` and press Enter
2. **Expected:**
   - ✅ Error: "Unknown command: /foobar (type /help)"
   - ✅ Red text

---

## Phase 5: Wizard Menu

### Test 24: `/wizard` - Main Menu
1. Type `/wizard` and press Enter
2. **Expected:**
   - ✅ Enters wizard mode
   - ✅ Shows profile name in yellow
   - ✅ Help text: "Esc: back • ↑/↓: select • Enter: open"
   - ✅ 3 options visible:
     - Models
     - Mounts
     - Init Project
   - ✅ Descriptions shown below list

3. **Test navigation:**
   - Press ↓ → ✅ Selection moves to "Mounts"
   - Press ↓ → ✅ Selection moves to "Init Project"
   - Press ↓ → ✅ Wraps to "Models"
   - Press ↑ → ✅ Moves back to "Init Project"
   - Press ↑ → ✅ Moves to "Mounts"
   - Press ↑ → ✅ Wraps to "Models"

4. Press Esc
5. **Expected:** ✅ Returns to chat mode

### Test 25: `/wizard models` (direct subcommand)
1. Type `/wizard models` and press Enter
2. **Expected:**
   - ✅ Directly opens models wizard (bypasses menu)
   - ✅ Same as selecting "Models" from menu
3. Press Esc to exit

**Note:** This works but is NOT in help text - should it be documented?

### Test 26: `/wizard mounts` (documented subcommand)
1. Type `/wizard mounts` and press Enter
2. **Expected:**
   - ✅ Directly opens mounts wizard (bypasses menu)
3. Press Esc to exit

### Test 27: `/wizard init-project` (undocumented subcommand)
1. Type `/wizard init-project` and press Enter
2. **Expected:**
   - ✅ Directly opens init project wizard
3. Press Esc to exit

**Note:** This works but is NOT in help text

### Test 28: `/wizard project` (alias, undocumented)
1. Type `/wizard project` and press Enter
2. **Expected:**
   - ✅ Opens init project wizard (same as init-project)
3. Press Esc to exit

**Note:** Alias works but not documented

---

## Phase 6: Models Wizard

### Test 29: `/models` - Direct Entry
1. Type `/models` and press Enter
2. **Expected:**
   - ✅ Enters models wizard mode
   - ✅ Shows profile name
   - ✅ Help text: "Esc: back • ↑/↓: select • Enter: edit • q: quit"
   - ✅ 6 model types listed:
     - Main model: {current value}
     - Subagent model: {value or "(inherit main)"}
     - Tool model: (blank)
     - Web model: (blank)
     - Image model: (blank)
     - Video model: (blank)
   - ✅ Help text below list

3. **Test navigation:**
   - Press ↓ → ✅ Selection moves to next model
   - Press ↓ repeatedly → ✅ Wraps around to top
   - Press ↑ → ✅ Moves up
   - Press ↑ repeatedly → ✅ Wraps around to bottom

### Test 30: Edit Model Value
1. With "Main model" selected, press Enter
2. **Expected:**
   - ✅ Enters edit mode
   - ✅ Shows current value
   - ✅ Prompt: "› {current value}"
   - ✅ Help text: "Enter to save (empty = clear) • Esc to cancel"

3. **Test editing:**
   - Type some characters → ✅ Appends to value
   - Press Backspace → ✅ Removes last character
   - Clear all and type "test-model"
   - Press Enter

4. **Expected:**
   - ✅ Message: "Saved model for profile "{name}". Restart ff-terminal to apply to the daemon."
   - ✅ Value updates in display
   - ✅ Returns to selection mode (not edit mode)

5. **Verify persistence:**
   - Press Esc to exit wizard
   - Re-enter with `/models`
   - ✅ Value should still show "test-model"

6. **Revert to original:**
   - Edit again and restore original value OR delete to clear

### Test 31: Cancel Editing
1. Select a model and press Enter to edit
2. Type some characters
3. Press Esc
4. **Expected:**
   - ✅ Exits edit mode WITHOUT saving
   - ✅ Original value unchanged
   - ✅ Returns to selection mode

### Test 32: Clear Model Value
1. Edit a model (non-subagent)
2. Delete all characters (empty value)
3. Press Enter
4. **Expected:**
   - ✅ Saves empty value
   - ✅ Display shows "(blank)"

### Test 33: `q` to Quit Models Wizard
1. Press `q` while in selection mode (not editing)
2. **Expected:**
   - ✅ Exits to chat mode

### Test 34: `q` During Edit Mode ⚠️ KNOWN ISSUE
1. Enter edit mode for a model
2. Type `q`
3. **Expected (current behavior):**
   - ⚠️ Adds "q" to model value (NOT quitting)
   - This is actually CORRECT - edit mode should capture all input
   - User must use Esc to cancel editing, THEN q to quit

**Question:** Is this expected behavior? Should `q` be disabled in edit mode?

---

## Phase 7: Mounts Wizard

### Test 35: Mounts Wizard Navigation
1. Type `/wizard mounts` and press Enter
2. **Expected:**
   - ✅ Enters mounts mode
   - ✅ Help text: "Esc: back • ↑/↓: select • Space/Enter: toggle • q: quit"
   - ✅ 2 mounts shown:
     - `[x]` or `[ ]` claude - Claude mounts (.claude/skills)
     - `[x]` or `[ ]` factory - Factory mounts (.factory/skills)
   - ✅ Help text below

3. **Test navigation:**
   - Press ↓ → ✅ Selection moves to factory
   - Press ↓ → ✅ Wraps to claude
   - Press ↑ → ✅ Moves to factory
   - Press ↑ → ✅ Wraps to claude

### Test 36: Toggle Mount with Space
1. Note current state of claude mount (enabled or disabled)
2. Press Space
3. **Expected:**
   - ✅ Checkbox toggles: `[x]` ↔ `[ ]`
   - ✅ Message: "Mount claude = {new state}"
   - ✅ Change is immediate

4. **Verify state persists:**
   - Press Esc to exit
   - Re-enter `/wizard mounts`
   - ✅ State should match what you set

5. **Toggle back to original state**

### Test 37: Toggle Mount with Enter
1. With a mount selected, press Enter
2. **Expected:**
   - ✅ Same behavior as Space (toggles mount)

### Test 38: `q` to Quit Mounts Wizard
1. Press `q` in mounts wizard
2. **Expected:**
   - ✅ Exits to chat mode

### Test 39: Verify Mount Changes Affect Skills
1. Run `/tools` and note if skill-related tools appear
2. Disable claude mount via `/wizard mounts`
3. Exit and run `/tools` again
4. **Expected:**
   - ⚠️ **To verify:** Do skill tools disappear?
   - Help text says "Changes take effect immediately for skill loading"
   - Need to confirm this actually happens

5. Re-enable claude mount

---

## Phase 8: Init Project Wizard

### Test 40: Init Project Wizard - Empty State

1. **Setup:** Ensure no projects exist
```bash
rm -rf ~/.config/ff-terminal/projects/*
```

2. Type `/init-project` and press Enter
3. **Expected:**
   - ✅ Enters init_project mode
   - ✅ Help text: "Type to filter • ↑/↓ select • Enter load • Esc quit"
   - ✅ Shows workspace path
   - ✅ Message: "No projects found under ff-terminal-workspace/projects/"
   - ⚠️ **Check:** Does it say "ff-terminal-workspace" or actual path?

4. Press Esc to exit

### Test 41: Create Test Projects

**Setup:**
```bash
# Create 3 test projects
mkdir -p ~/.config/ff-terminal/projects/project-alpha
echo "# Alpha" > ~/.config/ff-terminal/projects/project-alpha/PROJECT.md

mkdir -p ~/.config/ff-terminal/projects/project-beta
echo "# Beta" > ~/.config/ff-terminal/projects/project-beta/FF_PROJECT.md

mkdir -p ~/.config/ff-terminal/projects/project-gamma
# No context file - should show "needs_setup"
```

### Test 42: Init Project Wizard - With Projects
1. Type `/init-project` and press Enter
2. **Expected:**
   - ✅ 3 projects listed:
     - project-alpha (ready)
     - project-beta (ready)
     - project-gamma (needs setup)
   - ✅ Sorted by modification time (most recent first)
   - ✅ Filter shows "(none)"

3. **Test navigation:**
   - Press ↓ → ✅ Selection moves down
   - Press ↓ at bottom → ✅ Stops at last item (doesn't wrap)
   - Press ↑ → ✅ Selection moves up
   - Press ↑ at top → ✅ Stops at first item (doesn't wrap)

### Test 43: Filter Projects
1. In init_project wizard, type `alpha`
2. **Expected:**
   - ✅ Filter shows: "alpha"
   - ✅ Only "project-alpha" visible
   - ✅ Selection resets to index 0

3. Press Backspace to remove one character at a time
4. **Expected:**
   - ✅ Filter updates: "alph" → "alp" → "al" → "a" → "(none)"
   - ✅ Project list updates as filter changes
   - ✅ All projects visible when filter cleared

### Test 44: `q` Key Conflict ⚠️ KNOWN ISSUE
1. In init_project wizard, try to type `q` to filter
2. **Expected (current behavior):**
   - ⚠️ Wizard exits instead of adding "q" to filter
   - **Issue:** Cannot filter for projects containing "q" (e.g., "queue", "qemu", "sql-query")

**Bug confirmed:** `q` shortcut conflicts with typing

### Test 45: Load Project
1. In init_project wizard, select "project-alpha"
2. Press Enter
3. **Expected:**
   - ✅ Exits wizard to chat mode
   - ✅ Message: "✓ Loaded 1 project context files"
   - ✅ Shows project name and path
   - ✅ LLM turn starts
   - ✅ LLM summarizes project

### Test 46: Load Project Needing Setup
1. Type `/init-project` and select "project-gamma" (needs setup)
2. Press Enter
3. **Expected:**
   - ✅ Message: "✓ Created: FF_PROJECT.md"
   - ✅ Auto-generates template FF_PROJECT.md
   - ✅ Loads and summarizes

4. **Verify file created:**
```bash
cat ~/.config/ff-terminal/projects/project-gamma/FF_PROJECT.md
```
**Expected:** ✅ Template with project name and sections

### Test 47: Windowing with Many Projects

**Setup:** Create 25+ projects
```bash
for i in {1..30}; do
  mkdir -p ~/.config/ff-terminal/projects/test-project-$i
  echo "# Project $i" > ~/.config/ff-terminal/projects/test-project-$i/PROJECT.md
done
```

1. Type `/init-project` and press Enter
2. **Expected:**
   - ✅ Shows windowed view (20 items visible)
   - ✅ Selection starts at top

3. **Test scrolling:**
   - Press ↓ repeatedly
   - **Expected:** ✅ Window scrolls to keep selection centered (8 rows from top)
   - Continue to bottom
   - **Expected:** ✅ Window stops scrolling when selection reaches last 12 items

4. **Cleanup:**
```bash
rm -rf ~/.config/ff-terminal/projects/test-project-*
rm -rf ~/.config/ff-terminal/projects/project-*
```

---

## Phase 9: Keyboard Shortcuts

### Test 48: Ctrl+C Cancel Turn
1. Send a prompt that will take time (e.g., ask LLM to explain something complex)
2. While LLM is responding, press Ctrl+C
3. **Expected:**
   - ✅ Turn cancels
   - ✅ Spinner stops
   - ✅ processing state resets
   - ✅ No hanging state

### Test 49: Shift+Tab Mode Cycling (Already tested in Phase 2)
✅ Covered in Test 14

### Test 50: Esc in Wizards (Already tested)
✅ Covered in each wizard test

### Test 51: Arrow Keys in Wizards (Already tested)
✅ Covered in each wizard test

### Test 52: Backspace in Chat Input
1. Type some text in chat prompt
2. Press Backspace multiple times
3. **Expected:**
   - ✅ Deletes characters one at a time
   - ✅ Stops when input empty

### Test 53: Backspace in Filter (init_project)
✅ Covered in Test 43

### Test 54: Backspace in Edit Mode (models)
✅ Covered in Test 30

---

## Phase 10: Edge Cases

### Test 55: Long Input
1. Type a prompt with 500+ characters
2. Press Enter
3. **Expected:**
   - ✅ Entire prompt sent to LLM
   - ✅ No truncation
   - ✅ Response received normally

### Test 56: Rapid Commands
1. Type `/help` and quickly press Enter multiple times
2. **Expected:**
   - ✅ Only first command executes (subsequent enter on empty input ignored)
   - ✅ No duplicate outputs
   - ✅ UI remains responsive

### Test 57: Wizard Transition Stress Test
1. Open `/wizard`
2. Immediately press Esc
3. Open `/models`
4. Immediately press Esc
5. Open `/wizard mounts`
6. Toggle mount with Space
7. Press Esc
8. **Expected:**
   - ✅ All transitions smooth
   - ✅ No state corruption
   - ✅ No visual glitches

### Test 58: Empty Command
1. Type `/` and press Enter
2. **Expected:**
   - ✅ Shows help (same as `/help`)

### Test 59: Whitespace in Command
1. Type `/  help  ` and press Enter
2. **Expected:**
   - ✅ Command normalized (extra spaces ignored)
   - ✅ Help displayed

### Test 60: Special Characters in Command
1. Type `/héłp` and press Enter
2. **Expected:**
   - ✅ Non-alphanumeric removed → `/hlp`
   - ✅ Error: "Unknown command: /hlp"

### Test 61: Special Characters in Filter
1. In init_project wizard, type `alpha-beta_γ`
2. **Expected:**
   - ✅ Filter accepts all characters
   - ✅ Filters correctly (case-insensitive)

### Test 62: Unicode in Model Name
1. In models wizard, edit a model
2. Type unicode characters: `model-émojis-😀`
3. Press Enter
4. **Expected:**
   - ✅ Saves successfully
   - ✅ Displays correctly
   - ⚠️ Verify daemon accepts this (may depend on provider)

### Test 63: Daemon Disconnection
1. With UI running, stop the daemon (Ctrl+C in daemon terminal)
2. **Expected:**
   - ✅ UI shows "connecting..." status
   - ✅ Auto-reconnect attempts every 750ms
   - ⚠️ **May show errors** if commands sent during disconnect

3. Restart daemon
4. **Expected:**
   - ✅ UI reconnects automatically
   - ✅ Shows "connected" status

### Test 64: Concurrent Turn Attempt
1. Send a long prompt to LLM
2. While processing, try to send another prompt
3. **Expected:**
   - ⚠️ **Check behavior:** Does it queue? Ignore? Show error?
   - Current code doesn't explicitly prevent this

---

## Phase 11: Documentation Verification

### Test 65: Help Text Accuracy
1. Type `/help` and press Enter
2. **For each command listed:**
   - ✅ Verify command actually works (already tested above)
   - ✅ Verify description matches behavior

3. **Check for discrepancies:**
   - ⚠️ Is `/wizard models` mentioned?
   - ⚠️ Is `/wizard init-project` mentioned?
   - ⚠️ Does `/mounts` description clarify it's read-only?

### Test 66: CLAUDE.md Accuracy
1. Open `/Users/scrimwiggins/ff-terminal-ts/CLAUDE.md`
2. Find the "Common Tasks" or "Commands" section
3. **Verify:**
   - ✅ All commands mentioned in CLAUDE.md work
   - ✅ Command descriptions match implementation
   - ⚠️ Check for outdated info

### Test 67: Compare Python TUI vs TS Ink UI
1. If Python TUI available, compare feature set
2. **Verify:**
   - ⚠️ Custom commands (`/command`) not in TS (expected)
   - ✅ All other features match

---

## Summary Checklist

### Commands (19 implemented)
- [ ] `/help` - Show help
- [ ] `/tools` - List tools
- [ ] `/agents` - Show agents
- [ ] `/mounts` - Show mounts status
- [ ] `/theme` (or `/colors`) - Color preview
- [ ] `/clear` - Clear transcript
- [ ] `/mode` - Show/set operation mode
- [ ] `/planning` - Set planning mode
- [ ] Shift+Tab - Cycle modes
- [ ] `//text` - Escape slash
- [ ] `/quit` / `/exit` - Exit UI
- [ ] `/init` - Initialize session
- [ ] `/init-project` - Load project
- [ ] `/wizard` - Open wizard menu
- [ ] `/models` - Models wizard
- [ ] `/commands` - Not implemented message
- [ ] `/command` - Not implemented message
- [ ] Unknown command - Error handling

### Wizards (4 total)
- [ ] Main wizard menu
- [ ] Models wizard (edit, persist, cancel)
- [ ] Mounts wizard (toggle, persist)
- [ ] Init project wizard (filter, select, load)

### Keyboard Shortcuts
- [ ] Shift+Tab - Mode cycling
- [ ] Ctrl+C - Cancel turn
- [ ] Esc - Exit wizards
- [ ] Arrow keys - Navigate lists
- [ ] Enter - Submit/Select
- [ ] Backspace - Delete characters
- [ ] Space - Toggle (mounts)
- [ ] `q` - Quit wizards

### Edge Cases
- [ ] Long input
- [ ] Rapid commands
- [ ] Wizard transitions
- [ ] Empty/whitespace
- [ ] Special characters
- [ ] Unicode
- [ ] Daemon disconnect
- [ ] Concurrent turns

### Documentation
- [ ] Help text accurate
- [ ] CLAUDE.md accurate
- [ ] Known issues documented

---

## Issues Found During Testing

**Record any bugs or discrepancies here:**

1.

2.

3.

---

## Testing Completed

**Date:** _______________
**Tester:** _______________
**Result:** ✅ PASS / ⚠️ PASS WITH ISSUES / ❌ FAIL

**Notes:**

