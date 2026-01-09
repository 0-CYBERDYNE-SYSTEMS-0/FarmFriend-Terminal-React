# Scheduler Phase 3 Implementation Checklist

## Overview

Phase 3 adds integrations and advanced features to the scheduler:
- Result delivery to external channels (webhook, email, Discord, Slack)
- Wake modes for immediate execution

## Phase 3: Integrations & Advanced Features

### Task 3.1: Result Delivery

**Agent ID:** Claude Code
**Status:** completed

**Implementation Steps:**

- [x] 3.1.1 Create `src/runtime/scheduling/delivery.ts` with types
  - DeliveryConfig type
  - DeliveryChannel type (webhook, email, discord, slack)
  - DeliveryResult type

- [x] 3.1.2 Implement webhook delivery
  - sendWebhook function
  - HTTP POST with task result payload
  - Error handling with bestEffort support

- [x] 3.1.3 Implement email delivery (optional)
  - sendEmail function
  - SMTP configuration from env
  - Fallback to skip if not configured

- [x] 3.1.4 Implement Discord delivery (optional)
  - sendDiscord function
  - Discord webhook URL support
  - Message formatting for task results

- [x] 3.1.5 Implement Slack delivery (optional)
  - sendSlack function
  - Slack webhook URL support
  - Message formatting for task results

- [x] 3.1.6 Add delivery config to ScheduledTask
  - Add `delivery?: DeliveryConfig` to taskStore.ts
  - Include enabled, channels, bestEffort, includeOutput, includeLogs

- [x] 3.1.7 Add delivery args to scheduleTaskTool
  - Add delivery parameters to Args type
  - Handle delivery config in task creation

- [x] 3.1.8 Integrate delivery into ff-terminal.ts
  - Import delivery functions
  - Call delivery after successful task execution
  - Handle bestEffort (don't fail task if delivery fails)

- [x] 3.1.9 Update tool schema
  - Add delivery fields to tool_schemas.openai.json

- [x] 3.1.10 Verify implementation
  - Create task with webhook delivery
  - Test delivery execution
  - Verify bestEffort behavior

**Success Criteria:**
- TypeScript compiles without errors
- Webhook delivery works for successful task runs
- bestEffort flag prevents task failure on delivery error
- Delivery config stored in ScheduledTask
- Tool schema includes delivery fields

---

### Task 3.2: Wake Modes

**Agent ID:** _pending_
**Status:** not_started

**Implementation Steps:**

- [ ] 3.2.1 Add wake_mode to ScheduledTask type
  - Add `wake_mode?: "next-heartbeat" | "now"` to taskStore.ts

- [ ] 3.2.2 Add wake_mode to scheduleTaskTool args
  - Add wake_mode parameter to Args type
  - Include in task creation

- [ ] 3.2.3 Implement immediate wake signal
  - Create signal file mechanism in scheduler.ts
  - Watch for wake signal file
  - Trigger immediate scheduler check on signal

- [ ] 3.2.4 Integrate wake_mode into task execution
  - Check wake_mode when task is added/updated
  - Create wake signal file if wake_mode === "now"
  - Default to "next-heartbeat" if not specified

- [ ] 3.2.5 Update tool schema
  - Add wake_mode field to tool_schemas.openai.json

- [ ] 3.2.6 Verify implementation
  - Create task with wake_mode: "now"
  - Verify immediate execution
  - Test default "next-heartbeat" behavior

**Success Criteria:**
- TypeScript compiles without errors
- wake_mode: "now" triggers immediate execution
- wake_mode: "next-heartbeat" waits for next poll
- Signal file mechanism works reliably
- Tool schema includes wake_mode

---

## Execution Strategy

### Parallel Execution (Both tasks independent)

**Group A (Parallel):**
- Task 3.1: Result Delivery (Agent a1)
- Task 3.2: Wake Modes (Agent a2)

### Validation

After both agents complete:
1. Run `npm run build` to verify compilation
2. Test webhook delivery with sample task
3. Test wake_mode: "now" for immediate execution
4. Verify backward compatibility (existing tasks work)

---

## Integration Tests

- [ ] Build succeeds: `npm run build`
- [ ] Create task with webhook delivery
- [ ] Verify webhook receives task result
- [ ] Test bestEffort: true (delivery failure doesn't fail task)
- [ ] Create task with wake_mode: "now"
- [ ] Verify immediate execution
- [ ] Backward compatibility: tasks without delivery/wake_mode work unchanged

---

## Status Tracking

| Task | Agent | Status | Notes |
|------|-------|--------|-------|
| 3.1 Result Delivery | TBD | not_started | Webhook + external integrations |
| 3.2 Wake Modes | TBD | not_started | Immediate execution signals |

---

## Files to Create/Modify

### New Files
- `src/runtime/scheduling/delivery.ts` - Delivery system implementation

### Modified Files
- `src/runtime/scheduling/taskStore.ts` - Add delivery, wake_mode fields
- `src/runtime/scheduling/scheduleTaskTool.ts` - Add delivery, wake_mode args
- `src/runtime/scheduling/scheduler.ts` - Wake signal mechanism
- `src/bin/ff-terminal.ts` - Delivery integration
- `packet/tool_schemas.openai.json` - New fields

---

## Notes

- Task 3.1 (Delivery) should start with webhook only, other channels optional
- Task 3.2 (Wake Modes) uses file-based signaling for simplicity
- Both tasks maintain backward compatibility (optional fields)
- Both can execute in parallel (no dependencies)
