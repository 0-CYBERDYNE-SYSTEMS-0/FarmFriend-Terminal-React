# FF-Terminal Architecture Review: Agent Completion & Early Stopping Issues

**Document Purpose:** Technical briefing for AI engineers and agent builders to review the completion validation architecture and provide recommendations on solving early stopping issues.

**Date:** December 18, 2025
**System:** FF-Terminal (TypeScript CLI agent runtime)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Agent Loop Architecture](#2-core-agent-loop-architecture)
3. [Completion Validation System](#3-completion-validation-system)
4. [System Message Variants](#4-system-message-variants)
5. [The Problem We're Experiencing](#5-the-problem-were-experiencing)
6. [Historical Changes & Their Effects](#6-historical-changes--their-effects)
7. [Code Samples](#7-code-samples)
8. [Open Questions for Review](#8-open-questions-for-review)

---

## 1. System Overview

FF-Terminal is a TypeScript-based CLI agent runtime that:
- Connects to various LLM providers (OpenRouter, Anthropic, Z.ai, MiniMax, LM Studio)
- Executes 50+ tools (file ops, web search, code analysis, media generation)
- Streams responses via WebSocket to an Ink (React) terminal UI
- Supports multi-turn conversations with session persistence

### Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ff-terminal start                         │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│     ┌─────────────────┐      ┌─────────────────┐           │
│     │  daemon.ts      │      │  app.tsx        │           │
│     │  (WebSocket     │◄────►│  (Ink UI        │           │
│     │   Server)       │      │   Client)       │           │
│     │  Port 28888     │      │                 │           │
│     └────────┬────────┘      └─────────────────┘           │
│              │                                              │
│              ▼                                              │
│     ┌─────────────────┐                                    │
│     │  agentLoop.ts   │                                    │
│     │  (Generator)    │                                    │
│     └────────┬────────┘                                    │
│              │                                              │
│     ┌────────┴────────┐                                    │
│     ▼                 ▼                                    │
│  ┌──────────┐  ┌──────────────────┐                       │
│  │ Provider │  │ Tool Registry    │                       │
│  │ (LLM)    │  │ (50+ tools)      │                       │
│  └──────────┘  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Agent Loop Architecture

### Entry Point: `src/runtime/agentLoop.ts`

The agent loop is an **async generator** that yields `StreamChunk` objects back to the daemon/UI.

```typescript
export async function* runAgentTurn(params: {
  userInput: string;
  registry: ToolRegistry;
  sessionId: string;
  repoRoot?: string;
  modelOverride?: string;
  signal: AbortSignal;  // ← CRITICAL: Can interrupt at any point
}): AsyncGenerator<StreamChunk>
```

### Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT LOOP FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Load/Create Session                                              │
│     └─► session.conversation.push(userMessage)                       │
│                                                                      │
│  2. Build System Prompt                                              │
│     └─► Variant A, B, or C (configurable)                           │
│     └─► Include skills, session summary, repo context               │
│                                                                      │
│  3. Create Provider + Load Tool Schemas                              │
│     └─► Only advertise tools that are registered                    │
│                                                                      │
│  4. MAIN LOOP (max 8 iterations default)                             │
│     │                                                                │
│     ├─► Stream LLM response                                          │
│     │   └─► Yield content/thinking chunks to UI                     │
│     │                                                                │
│     ├─► Extract promises from assistant content (if validation on)  │
│     │                                                                │
│     ├─► IF NO TOOL CALLS:                                           │
│     │   └─► Run agent_stop hooks                                    │
│     │       ├─► action: "allow" → BREAK LOOP                        │
│     │       ├─► action: "block" → Inject system prompt, CONTINUE    │
│     │       └─► action: "need_user" → BREAK LOOP                    │
│     │                                                                │
│     ├─► IF TOOL CALLS:                                              │
│     │   └─► Execute tools in parallel                               │
│     │   └─► Record executions for promise fulfillment               │
│     │   └─► Feed results back to messages[]                         │
│     │   └─► CONTINUE LOOP                                           │
│     │                                                                │
│     └─► Loop until: no tools + allowed to stop, or max iterations   │
│                                                                      │
│  5. Log turn_complete ← ONLY REACHED IF LOOP EXITS NORMALLY         │
│                                                                      │
│  6. Yield task_completed chunk                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Critical Code Path: Stop Decision (Lines 446-474)

```typescript
if (!toolCalls.length) {
  // Agent wants to stop (no tool calls in response)
  const stop = await hookRegistry.runAgentStop({
    sessionId,
    repoRoot,
    workspaceDir: toolCtx?.workspaceDir,
    userInput,
    assistantContent,
    iteration: i,
    maxIterations,
    toolExecutionsCount: executionsThisTurn.length
  });

  if (stop.action === "block" && i < maxIterations - 1) {
    // FORCE CONTINUATION: Inject system prompt and keep looping
    if (stop.statusMessage) yield { kind: "status", message: stop.statusMessage };
    messages.push({ role: "system", content: stop.systemPrompt });
    continue;  // ← Re-enters LLM with new system message
  }

  if (stop.action === "need_user" && stop.statusMessage) {
    yield { kind: "status", message: stop.statusMessage };
  }

  break;  // ← Exit loop, turn ends
}
```

---

## 3. Completion Validation System

### Purpose

The completion validation system was designed to:
1. **Extract "promises"** from agent output (e.g., "I will read the file", "Let me search for...")
2. **Track tool executions** against those promises
3. **Block premature stopping** if high-confidence promises remain unfulfilled

### Promise Extraction (`src/runtime/hooks/completionValidator.ts`)

```typescript
// Regex patterns extract promises from agent text
const PATTERNS: Array<{ re: RegExp; type: PromiseType }> = [
  { re: /\bI\s*(?:'|')?ll\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bI\s+will\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bLet\s+me\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  // ... more patterns
];

// Promise structure
type Promise = {
  id: string;
  content: string;               // "I will read the config file"
  promiseType: PromiseType;      // "file_operation"
  extractedAction: string;       // "read"
  extractedTarget: string;       // "the config file"
  confidence: number;            // 0..1
  fulfilled: boolean;
  fulfillmentEvidence: string[];
};
```

### Fulfillment Matching

```typescript
// Match score calculation
function matchScore(promise: Promise, execution: ExecutionRecord): number {
  let score = 0;
  if (actionMatchesTool(promise.extractedAction, execution.toolName, promise.promiseType))
    score += 0.45;
  if (targetAppearsInArgs(promise.extractedTarget, execution.parameters))
    score += 0.35;
  if (execution.success)
    score += 0.2;
  return Math.min(1, score);
}

// Threshold: score >= 0.7 marks promise as fulfilled
```

### Stop Hook Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETION VALIDATION STOP HOOK                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Agent wants to stop (no tool calls)                                │
│              │                                                       │
│              ▼                                                       │
│  ┌─────────────────────────────────────┐                            │
│  │ Get unfulfilled high-confidence      │                            │
│  │ promises (confidence >= 0.65)        │                            │
│  └─────────────────┬───────────────────┘                            │
│                    │                                                 │
│         ┌─────────┴─────────┐                                       │
│         │ Any unfulfilled?  │                                       │
│         └─────────┬─────────┘                                       │
│                   │                                                  │
│         ┌────────┴────────┐                                         │
│         ▼                 ▼                                         │
│     [NO]              [YES]                                         │
│       │                  │                                          │
│       ▼                  ▼                                          │
│   ALLOW STOP      Made tool progress?                               │
│                         │                                           │
│              ┌──────────┴──────────┐                                │
│              ▼                     ▼                                │
│           [YES]                  [NO]                               │
│              │                     │                                │
│              ▼                     ▼                                │
│    Attempts < max?          Used reasoning kick?                    │
│         │                         │                                 │
│    ┌────┴────┐              ┌────┴────┐                            │
│    ▼         ▼              ▼         ▼                            │
│  [YES]     [NO]           [NO]      [YES]                          │
│    │         │              │         │                            │
│    ▼         ▼              ▼         ▼                            │
│  BLOCK    ALLOW          BLOCK     NEED_USER                       │
│  (continue)              (one-time)                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### OLD Implementation (Before Dec 18)

```typescript
const onStop = async (ctx: AgentStopContext): Promise<AgentStopResult> => {
  const unfulfilled = unfulfilledHighConfidence(promises);
  if (!unfulfilled.length) return { action: "allow" };

  const madeToolProgress = executions.length > lastGuardExecutions;

  // Stage 1: Block with continuation feedback
  if (madeToolProgress && blockAttempts < maxAttempts) {
    blockAttempts += 1;
    return {
      action: "block",
      systemPrompt: buildContinuationFeedback(unfulfilled),
      // "Complete these commitments: - file_operation: 'I will read...' ..."
    };
  }

  // Stage 2: One-time reasoning kick
  if (!reasoningOnlyKickUsed) {
    reasoningOnlyKickUsed = true;
    return {
      action: "block",
      systemPrompt: "Stop-hook: you are about to stop with unfulfilled commitments..."
    };
  }

  // Stage 3: Require user intervention
  return { action: "need_user" };
};
```

### CURRENT Implementation (After Dec 18)

```typescript
const onStop = async (ctx: AgentStopContext): Promise<AgentStopResult> => {
  if (!params.enabled) return { action: "allow" };

  const promises = params.getPromises();
  const executions = params.getExecutions();
  markFulfilled(promises, executions);

  const unfulfilled = unfulfilledHighConfidence(promises);
  // ADVISORY MODE: Always allow agent to stop naturally
  // The previous blocking logic created adversarial tension that caused loops
  return { action: "allow" };  // ← ALWAYS ALLOWS
};
```

**Note:** The promise tracking still runs, but the hook always returns "allow" regardless of unfulfilled promises.

---

## 4. System Message Variants

The system supports multiple system prompt variants that dramatically affect agent behavior.

### Variant A (Full Featured, ~1170 lines)

- Comprehensive tool guidance
- Mandatory task completion checklist
- "Final Answer Delivery Protocol" section
- Heavy emphasis on TodoWrite usage
- Completion validation hints embedded

### Variant B (Similar to A)

- Same structure as A
- Minor wording differences

### Variant C (Simplified, ~230 lines)

- Created specifically to reduce agent obsession behaviors
- Removed mandatory checkpoint language
- Made TodoWrite optional
- Clearer [AWAITING_INPUT] stop token instructions
- No adversarial "you MUST" language

### Key Differences

| Aspect | Variant A/B | Variant C |
|--------|-------------|-----------|
| Length | ~1170 lines | ~230 lines |
| TodoWrite | "MUST use to organize" | "Optional helper" |
| Checkpoints | "MANDATORY before stopping" | "Recommended" |
| Tone | Adversarial ("you MUST") | Collaborative |
| Stop token | Mentioned in middle | Prominent at top |

### The Conflict

When Variant A/B was used with blocking completion validation:
- System prompt said: "You MUST complete all tasks before stopping"
- Completion validation said: "You have unfulfilled promises, blocked"
- Agent response: Loop infinitely trying to satisfy both

---

## 5. The Problem We're Experiencing

### Observed Symptoms

1. **Incomplete turns in session logs** - `turn_start` without matching `turn_complete`
2. **Agent stops mid-operation** - Announces work, doesn't complete it
3. **Broken task conclusions** - User asks for X, agent stops after partial work

### Session Log Evidence

```jsonl
{"event":"turn_start","turn_id":"turn_19b3385b78f","user_input":"can u make pdfs?"}
// NO EVENTS FOR 7 SECONDS
{"event":"turn_start","turn_id":"turn_19b3385d3ec","user_input":"hold on"}
{"event":"assistant_message","turn_id":"turn_19b3385d3ec",...}
{"event":"turn_complete","turn_id":"turn_19b3385d3ec","duration_ms":6884}
{"event":"turn_start","turn_id":"turn_19b3385ef08","user_input":"what else?"}
// NO FURTHER EVENTS - SESSION ENDS
```

**Analysis:**
- Turn 1: Started, never completed (interrupted by user sending "hold on")
- Turn 2: Normal completion
- Turn 3: Started, never completed (connection dropped or agent stopped)

### Two Distinct Problems Identified

#### Problem A: AbortSignal Generator Interruption (Code Bug)

When the AbortSignal fires (Ctrl+C, new message, connection drop), the async generator exits before reaching `turn_complete` logging.

```typescript
// Current: No protection around the loop
for (let i = 0; i < maxIterations; i += 1) {
  // If signal.abort() fires here, generator exits
  // turn_complete at line 638 is NEVER REACHED
}
logger.log("info", "turn_complete", ...);  // ← Only if loop exits normally
```

#### Problem B: Agent Voluntarily Stopping Early (Behavioral)

With advisory-only completion validation, the agent can stop whenever it decides to. Weaker models (GLM-4.6, etc.) are more likely to stop prematurely.

**Before:** Blocking validation would force 1-2 retry attempts
**After:** No enforcement, agent stops immediately

---

## 6. Historical Changes & Their Effects

### Timeline

| Date | Commit | Change | Effect |
|------|--------|--------|--------|
| Initial | f74c01e | Blocking completion validation | Enforced promise fulfillment |
| Dec 18 09:33 | 4b8323d | Advisory mode + Variant C | Stopped loops, but no enforcement |
| Dec 18 10:00 | 9d94af8 | Removed TodoWrite from Variant C | Stopped TodoWrite obsession |
| Dec 18 13:10 | dd000a9 | Always-allow in hook + schema changes | Complete removal of enforcement |

### What Each Change Was Solving

**4b8323d (Advisory Mode):**
- Problem: Agent caught in infinite loops trying to satisfy validation + system prompt
- Solution: Make validation advisory (just track, don't block)
- Side effect: No longer enforces completion

**9d94af8 (TodoWrite Removal):**
- Problem: Agent calling TodoWrite 4+ times in 20 seconds instead of working
- Solution: Remove TodoWrite emphasis from system prompt
- Side effect: Less task tracking visibility

**dd000a9 (Always-Allow):**
- Problem: Remaining blocking code paths causing issues
- Solution: Always return "allow" from hook
- Side effect: Promise tracking is now completely unused

---

## 7. Code Samples

### Current Stop Hook (Non-functional)

```typescript
// src/runtime/hooks/builtin/completionValidationStopHook.ts
export function createCompletionValidationStopHook(params: {
  enabled: boolean;
  maxAttempts: number;
  getPromises: () => CompletionPromise[];
  getExecutions: () => ExecutionRecord[];
}): Hook & { type: "agent_stop" } {
  // These state variables are now dead code
  let blockAttempts = 0;
  let lastGuardSignature: string | null = null;
  let lastGuardExecutions = 0;
  let reasoningOnlyKickUsed = false;

  const onStop = async (_ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled) return { action: "allow" };

    const promises = params.getPromises();
    const executions = params.getExecutions();
    markFulfilled(promises, executions);

    const unfulfilled = unfulfilledHighConfidence(promises);
    // ADVISORY MODE: Always allow
    return { action: "allow" };
  };

  return {
    type: "agent_stop",
    name: "completion_validation_stop",
    priority: 50,
    enabled: true,
    run: onStop
  };
}
```

### Agent Loop Stop Decision

```typescript
// src/runtime/agentLoop.ts (lines 446-474)
if (!toolCalls.length) {
  const stop = await hookRegistry.runAgentStop({
    sessionId,
    repoRoot,
    workspaceDir: toolCtx?.workspaceDir,
    userInput,
    assistantContent,
    iteration: i,
    maxIterations,
    toolExecutionsCount: executionsThisTurn.length
  });

  logger.log("debug", "agent_stop_decision", {
    action: stop.action,
    reason: stop.reason
  });

  if (stop.action === "block" && i < maxIterations - 1) {
    // Currently never reached - hook always returns "allow"
    messages.push({ role: "system", content: stop.systemPrompt });
    continue;
  }

  break;  // Always breaks on first stop attempt
}
```

### Promise Extraction Patterns

```typescript
// src/runtime/hooks/completionValidator.ts
const PATTERNS: Array<{ re: RegExp; type: PromiseType }> = [
  // "I'll read the config file"
  { re: /\bI\s*(?:'|')?ll\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },

  // "I will search for the error"
  { re: /\bI\s+will\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },

  // "Let me check the logs"
  { re: /\bLet\s+me\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },

  // "First, I need to analyze..."
  { re: /\bFirst,?\s+I\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },

  // File-specific patterns
  { re: /\bI\s+will\s+(read|write|edit|create)\s+([^.!?]+)\b/gi, type: "file_operation" },

  // Research patterns
  { re: /\bLet\s+me\s+(search|find|investigate)\s+([^.!?]+)\b/gi, type: "research" },
];
```

---

## 8. Open Questions for Review

### Architecture Questions

1. **Should completion validation be blocking, advisory, or hybrid?**
   - Blocking caused loops with certain system prompts
   - Advisory provides no enforcement
   - Hybrid (one soft block, then allow) might be the middle ground?

2. **How should we handle the system prompt vs hook conflict?**
   - Should the system prompt NOT mention completion requirements if the hook enforces them?
   - Or should they work together with compatible language?

3. **Is promise extraction the right approach?**
   - Regex-based extraction is fragile
   - Alternative: Require explicit "plan" structure the model outputs?
   - Alternative: Use a separate "commitment" tool the model must call?

4. **Model-specific behavior:**
   - Strong models (Claude, GPT-4) might not need enforcement
   - Weaker models (GLM-4.6, local) stop prematurely more often
   - Should validation strictness be model-dependent?

### Implementation Questions

5. **How to handle AbortSignal interruption?**
   - Add try-finally to ensure logging?
   - Track "aborted" state explicitly?
   - Resume interrupted turns?

6. **What should happen when the agent genuinely can't complete a task?**
   - Current: Loops infinitely (with blocking) or stops silently (with advisory)
   - Ideal: Clear escalation to user with context

7. **Tool schema vs system prompt for behavior control:**
   - We found changing tool schema descriptions more effective than system prompts
   - Should we move more behavioral guidance into tool schemas?

### Trade-off Questions

8. **Thoroughness vs responsiveness:**
   - Blocking validation increases task completion but slows interaction
   - Advisory mode is fast but less reliable
   - What's the right balance?

9. **User control:**
   - Should users be able to force continuation?
   - Should unfulfilled promises be visible in UI?
   - Should there be a `/continue` command?

---

## Summary

**Current State:**
- Completion validation is effectively disabled (always allows stop)
- Promise tracking runs but results are unused
- No enforcement of announced commitments
- Generator has no protection against AbortSignal interruption

**The Dilemma:**
- Blocking validation caused loops and tool obsession
- Advisory validation causes premature stopping
- Need a solution that enforces completion without creating adversarial loops

**Your Input Requested:**
We're looking for recommendations on the best architecture for ensuring agents complete their announced work without creating the loop/obsession problems we experienced with the blocking approach.

---

*Please reach out with questions or for additional code samples.*
