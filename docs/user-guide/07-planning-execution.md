# Planning & Execution

**Automatic plan extraction and step-by-step execution**

---

## Overview

The planning and execution system allows FF Terminal to automatically extract plans from natural language requests and execute them step-by-step with validation. This is particularly useful for complex, multi-step tasks that benefit from explicit planning.

---

## Planning Mode

Planning mode enables automatic plan extraction:

```bash
/mode planning
```

### How Planning Mode Works

1. **Request Analysis:** When you make a request, the agent analyzes it for multi-step intent
2. **Plan Extraction:** A plan is extracted with numbered steps
3. **Step Validation:** Each step is validated before execution
4. **Progress Tracking:** Progress is tracked through the todo list
5. **Completion Detection:** The system detects when all steps are complete

---

## Plan Extraction

### Automatic Extraction

When you make a request like:

```
Build a REST API for user management with authentication
```

The agent extracts a plan:

```
Plan:
1. Create project structure
2. Set up dependencies
3. Create database schema
4. Implement authentication
5. Create user CRUD endpoints
6. Add validation
7. Write tests
8. Document API
```

### Manual Plan Specification

You can also specify plans explicitly:

```
Plan:
1. Create user model
2. Create authentication middleware
3. Create user routes
4. Add login endpoint
5. Test the API
```

---

## Step Execution

### Automatic Step Execution

In planning mode, steps execute automatically:

```
Step 1/5: Create user model
✓ Created src/models/user.ts

Step 2/5: Create authentication middleware
✓ Created src/middleware/auth.ts

Step 3/5: Create user routes
✓ Created src/routes/users.ts

Step 4/5: Add login endpoint
✓ Created src/routes/auth.ts

Step 5/5: Test the API
✓ All tests passed
```

### Validation

Each step is validated before proceeding:

```
Step 2/3: Create authentication middleware
⚠ Validation: Checking file doesn't exist
✓ Validation passed
```

### Error Handling

If a step fails:

```
Step 2/3: Create authentication middleware
✗ Error: File already exists
What would you like to do?
- Skip this step
- Retry this step
- Modify the step
- Abort plan
```

---

## Todo Integration

Plans are integrated with the todo system:

### Todo Display

```
Todos:
✓ Create project structure
✓ Set up dependencies
○ Create database schema    ← Current step
○ Implement authentication
○ Create user CRUD endpoints
```

### Todo Updates

The agent automatically updates the todo list:
- **✓** for completed steps
- **○** for pending steps
- Current step is highlighted

### Manual Todo Management

You can also manage todos manually:

```
Add todo: "Document API endpoints"
Complete todo: "Create user routes"
Delete todo: "Set up logging"
```

---

## Plan Configuration

### Enable Planning Mode

```bash
# Interactive mode
/mode planning

# Command line
ff-terminal start --mode planning
```

### Plan Extraction Settings

Configure plan extraction via environment:

```bash
# Maximum plan steps
export FF_PLAN_MAX_STEPS=20

# Plan validation timeout
export FF_PLAN_VALIDATION_TIMEOUT=30000

# Auto-continue on validation failure
export FF_PLAN_AUTO_SKIP=false
```

---

## Plan Structure

### Plan Format

Plans follow this structure:

```markdown
Plan:
1. Step one description
2. Step two description
3. Step three description

Context:
- Additional context for the plan
- Can include multiple lines

Goal:
- Overall goal of the plan
```

### Step Format

Each step should be:
- **Atomic:** One task per step
- **Clear:** Unambiguous description
- **Achievable:** Single tool or small set of tools
- **Verifiable:** Can confirm completion

### Example Plan

```markdown
Plan:
1. Create React component structure
2. Add TypeScript interfaces
3. Implement component logic
4. Add styling
5. Write unit tests

Context:
- Using Material-UI components
- TypeScript with strict mode
- Jest for testing

Goal:
- Create a fully functional dashboard component
```

---

## Execution Modes with Planning

### Auto + Planning

Automatically execute all steps:

```
/mode auto
```

**Use when:** You trust the plan and want maximum speed.

### Confirm + Planning

Confirm each step before execution:

```
/mode confirm
```

**Use when:** You want to review each step.

### Read-Only + Planning

Extract plan but don't execute:

```
/mode read_only
```

**Use when:** You want to review the plan before execution.

---

## Plan Storage

Plans and execution history are stored in:

```
<workspace>/memory_core/sessions/<session-id>/
├── plan.json          # Extracted plan
├── todos.json         # Todo list
└── execution.json     # Execution history
```

### Plan File

```json
{
  "id": "plan-123",
  "originalRequest": "Build a REST API",
  "steps": [
    {
      "id": 1,
      "description": "Create project structure",
      "status": "completed",
      "toolCalls": ["run_command"]
    }
  ],
  "currentStep": 2,
  "completedAt": null
}
```

---

## Complex Plans

### Nested Plans

Plans can include sub-plans:

```markdown
Plan:
1. Set up project
   Sub-plan:
   - Initialize git
   - Create package.json
   - Install dependencies
2. Implement features
3. Test and deploy
```

### Parallel Execution

Some steps can run in parallel:

```markdown
Plan:
1. Set up project (steps 1-3 can run in parallel)
2. Implement features (steps 4-8 must run sequentially)
3. Test and deploy (steps 9-10 sequentially)
```

### Conditional Steps

Steps can have conditions:

```markdown
Plan:
1. Create user model
2. If authentication is needed:
   - Create authentication middleware
   - Add login endpoint
3. Create API routes
```

---

## Progress Tracking

### Real-Time Progress

Progress is displayed in real-time:

```
Plan Progress: 3/8 steps (37.5%)
├─ ✓ Create project structure
├─ ✓ Set up database
├─ ✓ Implement user model
├─ ○ Create authentication      ← Current
├─ ○ Add login endpoint
├─ ○ Create user CRUD
├─ ○ Add validation
└─ ○ Write tests
```

### Completion Detection

The system detects plan completion:

**Completion signals:**
- All steps completed
- User confirms completion
- Natural language "I'm done"
- Explicit `/complete` command

---

## Troubleshooting

### Plan Not Extracting

```bash
# Check mode is set to planning
/mode

# Verify plan extraction is enabled
export FF_PLANNING_ENABLED=true

# Check for complex request format
# Try: "Plan: 1. Step one 2. Step two"
```

### Steps Not Executing

```bash
# Check execution mode
/mode auto

# Verify tool permissions
/tools

# Check for tool restrictions in plan
```

### Plan Stuck

```bash
# Force continue
/continue

# Skip current step
/skip

# Abort plan
/abort

# Start fresh plan
/newplan
```

---

## Best Practices

### Writing Good Plans

**Do:**
- Use clear, specific step descriptions
- Keep steps atomic (one task per step)
- Order steps logically
- Include validation steps

**Don't:**
- Create too many steps (max 20)
- Make steps too vague
- Skip verification steps
- Create dependent steps out of order

### Using Planning Mode

**Good for:**
- Multi-step tasks
- Complex workflows
- Tasks requiring validation
- Learning workflows

**Not ideal for:**
- Simple questions
- Quick file edits
- Single-tool operations

---

## Planning API

### Programmatic Plan Execution

```typescript
import { extractPlan, executePlan } from './runtime/planning/index.js';

const plan = await extractPlan(
  "Build a REST API for user management",
  { mode: 'planning' }
);

const result = await executePlan(plan);
```

### Plan Validation

```typescript
import { validatePlan } from './runtime/planning/index.js';

const errors = await validatePlan(plan);
if (errors.length > 0) {
  console.error('Plan has issues:', errors);
}
```

---

## Examples

### Example 1: Simple Plan

```
Request: Create a new React component

Plan:
1. Create component file
2. Add basic structure
3. Export component

Progress: 3/3 steps completed ✓
```

### Example 2: Complex Plan

```
Request: Set up a complete authentication system

Plan:
1. Create user model with TypeScript
2. Set up database connection
3. Implement password hashing
4. Create authentication middleware
5. Add login/logout endpoints
6. Create registration endpoint
7. Add JWT token generation
8. Write unit tests
9. Document API

Progress: 5/9 steps (55%)
└─ Currently on step 5
```

### Example 3: Interactive Plan

```
Request: Refactor the authentication module

Plan:
1. Analyze current auth implementation
2. Identify refactoring opportunities
3. Create backup of current code
4. Refactor authentication logic
5. Update tests
6. Verify functionality

Step 2/6: Identify refactoring opportunities
What should be the refactoring priority?
- Performance
- Security
- Maintainability
→ Choose priority to continue
```

---

## Next Steps

1. **[Autonomy Loop](08-autonomy-loop.md)** - Set up long-running autonomous agents
2. **[Task Scheduling](09-task-scheduling.md)** - Schedule recurring tasks
3. **[Hooks System](10-hooks-system.md)** - Configure validation hooks

---

**Built with technical precision and agentic intelligence**
