# macOS Automator MCP Evaluation

## Executive Summary

Evaluated [steipete/macos-automator-mcp](https://github.com/steipete/macos-automator-mcp) for potential enhancement of ff-terminal's `macos_control` tool. The MCP server provides sophisticated AppleScript/JXA automation with a knowledge base of 200+ pre-built scripts.

**Recommendation: SELECTIVE INTEGRATION** - Adopt knowledge base concept and structured script library, but keep our direct tool implementation.

---

## What steipete's macOS Automator MCP Offers

### Core Architecture

**3 Primary MCP Tools:**
1. **execute_script** - Run AppleScript/JXA with multiple input methods:
   - Inline script content
   - File paths to scripts
   - Knowledge base script IDs with parameter substitution
   - Configurable timeouts and output formatting

2. **get_scripting_tips** - Search 200+ pre-built automation recipes:
   - Fuzzy search by category, keyword, or script ID
   - Built-in library of common automation patterns
   - Category-organized knowledge base

3. **accessibility_query** - UI element inspection and manipulation:
   - Leverages macOS Accessibility APIs
   - Detailed UI automation without native app support
   - Element inspection across applications

### Technical Implementation

**Execution Engine:**
- Uses `osascript` (same as our implementation)
- Supports both AppleScript and JXA (`-l JavaScript` flag)
- 4 output formatting modes: `human_readable`, `structured_error`, `structured_output_and_error`, `direct`
- Default 30-second timeout (configurable)
- Comprehensive error categorization

**Knowledge Base System:**
- 200+ pre-built scripts organized by category
- Categories include:
  - `01_applescript_core`
  - `05_web_browsers/safari`
  - Custom user overrides via `~/.macos-automator/knowledge_base`
- Markdown-based script storage with frontmatter metadata
- Placeholder/parameter substitution system
- Shared handler library (`_shared_handlers`)

**Tech Stack:**
- @modelcontextprotocol/sdk (^1.25.1)
- fuse.js (fuzzy search)
- gray-matter (frontmatter parsing)
- zod (schema validation)
- TypeScript + Vitest

---

## Current ff-terminal `macos_control` Implementation

### What We Have

**Actions Supported:**
- `open_app` - Activate application via AppleScript
- `send_keys` - Type text into focused input
- `spotlight_search` - Cmd+Space search workflow
- `applescript` - Run custom AppleScript
- `click` - Coordinate-based clicking (requires `cliclick`)

**Implementation:**
- Direct `osascript` execution via Node.js `spawn`
- Simple AppleScript string templates
- AbortSignal integration for cancellation
- Wait time support
- Basic error handling

**Limitations:**
- No script library or templates
- No JXA support
- No structured output formatting
- No UI element inspection
- Limited click capabilities (requires external `cliclick`)
- Placeholder actions: `template`, `workflow`, `simple_task` not implemented

---

## Comparison Matrix

| Feature | ff-terminal macos_control | steipete macOS Automator MCP |
|---------|---------------------------|------------------------------|
| **AppleScript execution** | ✅ Yes | ✅ Yes |
| **JXA execution** | ❌ No | ✅ Yes |
| **Script library** | ❌ No | ✅ 200+ scripts |
| **Fuzzy search** | ❌ No | ✅ Yes (fuse.js) |
| **Parameter substitution** | ❌ No | ✅ Yes |
| **UI element inspection** | ❌ No | ✅ Yes (accessibility API) |
| **Output formatting** | ❌ Basic | ✅ 4 modes |
| **User overrides** | ❌ No | ✅ Yes |
| **Error categorization** | ✅ Basic | ✅ Comprehensive |
| **MCP protocol** | ❌ No (direct tool) | ✅ Yes |
| **Integration** | ✅ Native ff-terminal tool | ❌ External MCP server |

---

## Key Learnings & Enhancement Opportunities

### 1. **Knowledge Base Concept** 🎯 HIGH VALUE
The 200+ pre-built script library is the killer feature. Instead of LLMs writing AppleScript from scratch every time, they can reference proven, tested scripts.

**Adoption Strategy:**
- Create `kb/` directory in ff-terminal with categorized automation scripts
- Store as `.applescript` and `.js` (JXA) files with metadata
- Build simple lookup system (no need for full fuzzy search initially)
- Allow user overrides in workspace directory

### 2. **JXA Support** 🎯 MEDIUM VALUE
JavaScript for Automation is more powerful than AppleScript for complex logic and modern app automation.

**Adoption Strategy:**
- Add `language` parameter to `macos_control` tool: `applescript` (default) or `jxa`
- Pass `-l JavaScript` flag to `osascript` when `language: 'jxa'`
- Minimal code change to `runAppleScript()` function

### 3. **Parameter Substitution** 🎯 MEDIUM VALUE
The placeholder system allows reusable script templates with variable substitution.

**Example:**
```applescript
-- Template: open_url_in_safari.applescript
-- Params: {url}
tell application "Safari"
    open location "{url}"
    activate
end tell
```

**Adoption Strategy:**
- Simple string replacement: `script.replace(/{(\w+)}/g, (_, key) => params[key])`
- Add `params` field to tool schema
- Validate required parameters

### 4. **Accessibility Query Tool** 🎯 LOW-MEDIUM VALUE
UI element inspection is powerful but complex. Requires deep macOS Accessibility API knowledge.

**Adoption Strategy:**
- **Option A:** Don't implement - use steipete's MCP via MCPorter if needed
- **Option B:** Create simplified version focusing on common use cases (button clicks, text field entry)
- **Recommendation:** Skip for now, use external MCP if needed

### 5. **Output Formatting** 🎯 LOW VALUE
The 4 output modes are nice-to-have but not critical for our use case.

**Adoption Strategy:**
- Skip for now - our current stdout/stderr capture is sufficient
- Can add later if LLMs struggle with output parsing

---

## Integration Recommendations

### ADOPT ✅

1. **Knowledge Base System**
   - Create `src/runtime/tools/implementations/macos_control/kb/` directory
   - Port/write essential scripts:
     - Safari automation (open URL, get tabs, close tab)
     - Finder operations (new folder, move files, get selection)
     - Notes app (create note, append text)
     - System controls (volume, brightness, notifications)
     - Common workflows (screenshot, copy/paste)
   - Start with ~20-30 essential scripts, grow over time
   - File format: `.applescript` or `.js` with simple frontmatter

2. **JXA Support**
   - Add `language?: 'applescript' | 'jxa'` to tool schema
   - Modify `runAppleScript()` to accept language parameter
   - Update execution to use `-l JavaScript` flag for JXA

3. **Script Templates with Parameters**
   - Add `kb_script_id?: string` to tool schema
   - Add `params?: Record<string, string>` to tool schema
   - Simple placeholder substitution: `{param_name}`
   - Load scripts from knowledge base by ID

### DEFER ⏸️

4. **Accessibility Query Tool**
   - Complex implementation, unclear immediate value
   - Can use steipete's MCP directly via MCPorter if needed
   - Revisit after core knowledge base is established

5. **Advanced Output Formatting**
   - Current approach works fine
   - LLMs don't currently struggle with output parsing
   - Add only if specific need arises

### SKIP ❌

6. **Full MCP Protocol Integration**
   - We already have native tool integration
   - Adding MCP layer adds complexity without clear benefit
   - Can run steipete's server separately if MCP-specific features needed

---

## Implementation Plan

### Phase 1: JXA Support (30 minutes)
- [ ] Add `language` parameter to `macosControlTool()` function
- [ ] Update `runAppleScript()` to accept language and pass `-l JavaScript` flag
- [ ] Update tool schema in `tool_schemas.openai.json`
- [ ] Test with simple JXA script

### Phase 2: Knowledge Base Structure (1-2 hours)
- [ ] Create `src/runtime/tools/implementations/macos_control/kb/` directory
- [ ] Define category structure:
  - `01_applications/` (Safari, Finder, Notes, Mail)
  - `02_system/` (volume, brightness, notifications)
  - `03_workflows/` (screenshot, clipboard, search)
- [ ] Create script metadata format (simple frontmatter)
- [ ] Build script loader utility
- [ ] Add `kb_script_id` parameter to tool

### Phase 3: Essential Scripts Library (2-4 hours)
- [ ] Port/write 20-30 essential automation scripts:
  - Safari: open URL, get tabs, close tab, new window
  - Finder: new folder, move file, get selection, open location
  - Notes: create note, append text, get notes
  - System: set volume, show notification, get clipboard
  - Workflows: take screenshot, spotlight search, copy/paste

### Phase 4: Parameter Substitution (1 hour)
- [ ] Add `params` parameter to tool schema
- [ ] Implement simple placeholder replacement
- [ ] Validate required parameters from script metadata
- [ ] Document parameter usage

### Total Estimated Time: 4-7 hours

---

## Example Usage (After Implementation)

### Current Approach
```typescript
// LLM must write full AppleScript from scratch
{
  "action": "applescript",
  "target": "tell application \"Safari\" to open location \"https://news.ycombinator.com\""
}
```

### Enhanced Approach
```typescript
// LLM uses knowledge base script with parameters
{
  "action": "kb_script",
  "kb_script_id": "safari/open_url",
  "params": {
    "url": "https://news.ycombinator.com"
  }
}
```

### JXA Support
```typescript
// Complex logic better suited for JavaScript
{
  "action": "applescript",
  "language": "jxa",
  "target": `
    const safari = Application('Safari');
    const windows = safari.windows();
    return windows.map(w => w.tabs().map(t => t.url())).flat();
  `
}
```

---

## Risks & Considerations

### Knowledge Base Maintenance
- Scripts may break with macOS updates
- Need testing across macOS versions
- User contributions require review

**Mitigation:**
- Start small (20-30 scripts)
- Focus on stable, core functionality
- Document macOS version compatibility
- Accept user override capability

### Script Security
- Arbitrary AppleScript/JXA execution is powerful
- Scripts could be malicious if sourced externally

**Mitigation:**
- Only ship vetted scripts in core distribution
- User overrides are user's responsibility
- Document security considerations
- Consider script signing in future

### Complexity Creep
- Knowledge base adds new subsystem to maintain
- Parameter substitution adds logic complexity

**Mitigation:**
- Keep implementation simple (no fuzzy search, no complex frontmatter)
- Iterate based on real usage patterns
- Don't implement features we don't need

---

## Conclusion

**The macOS Automator MCP's knowledge base concept is brilliant and highly applicable to ff-terminal.**

Rather than using it as an external MCP server, we should adopt its best ideas:
1. ✅ Build our own knowledge base of essential automation scripts
2. ✅ Add JXA support for modern JavaScript-based automation
3. ✅ Implement simple parameter substitution for reusable templates
4. ⏸️ Defer complex features like accessibility query
5. ❌ Skip full MCP integration - keep our native tool approach

This gives us the power of steipete's automation library while maintaining direct integration with ff-terminal's tool system. LLMs will be more effective at macOS automation with proven script templates rather than writing AppleScript from scratch every time.

**Estimated implementation: 4-7 hours for full Phase 1-4 rollout.**

---

## References

- [steipete/macos-automator-mcp](https://github.com/steipete/macos-automator-mcp)
- [steipete's agent rules for MCPs](https://github.com/steipete/agent-rules/blob/main/global-rules/steipete-mcps.md)
- [MCPorter - Call MCPs via TypeScript](https://github.com/steipete/mcporter)
- [Peekaboo MCP documentation](https://github.com/steipete/Peekaboo/blob/main/docs/commands/mcp.md)
