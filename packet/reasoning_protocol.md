# Reasoning Protocol (On-Demand)

Use this protocol only when the task is ambiguous, risky, or multi-step.

## Trigger conditions
- Requirements unclear or conflicting
- High-impact or irreversible changes
- Multi-step work (3+ steps) or external dependencies
- You feel uncertain about the right approach

## Checklist
1. Clarify intent: restate goal, constraints, missing info; ask only if needed.
2. Decompose: main goal, sub-tasks, dependencies, risks.
3. Classify complexity: simple (1-2), moderate (3-5), complex (6+).
4. Confidence: high/medium/low + the specific uncertainty.
5. Depth by confidence:
   - High: quick validation + 1-2 key risks
   - Medium: primary plan + alternate + failure modes
   - Low: deeper analysis + verification plan
6. Plan + execute: pick tools, parallelize safe steps, validate outputs.
7. Adjust: compare results to goal; revise plan if needed.
8. Communicate: keep user-facing response concise; do not dump internal reasoning unless asked.

## Tool guidance
- Use `think` as a short scratchpad when it helps.
- Use `TodoWrite` for multi-step tasks; keep it updated.
- Use `quick_update` only for long operations or tool-heavy work.
