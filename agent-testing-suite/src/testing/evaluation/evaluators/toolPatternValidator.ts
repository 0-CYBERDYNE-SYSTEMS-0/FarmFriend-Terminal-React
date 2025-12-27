import { Evaluator, EvaluationResult, ScenarioResult } from "../../types.js";

/**
 * Evaluate tool usage pattern assertions
 * Supports: tool_called, tool_not_called, tool_call_count, tool_call_sequence
 */
export const toolPatternValidator: Evaluator = {
  name: "tool_pattern",
  evaluate: async (result: ScenarioResult, context: any): Promise<EvaluationResult> => {
    const { condition, expected } = context.assertion;

    // In a real implementation, tool usage would come from session logs
    // For now, we use result.tool_calls count
    const toolCalls = result.tool_calls || 0;
    const toolUsage = context.toolUsage || {}; // Would contain per-tool call counts

    let passed = false;
    let details = "";

    switch (condition) {
      case "tool_called": {
        const toolName = expected;
        const calls = toolUsage[toolName]?.call_count || 0;
        passed = calls > 0;
        details = passed
          ? `Tool ${toolName} was called (${calls} times)`
          : `Tool ${toolName} was not called (expected at least 1 call)`;
        break;
      }

      case "tool_not_called": {
        const toolName = expected;
        const calls = toolUsage[toolName]?.call_count || 0;
        passed = calls === 0;
        details = passed
          ? `Tool ${toolName} was not called (correct)`
          : `Tool ${toolName} was called ${calls} time(s) (should not be called)`;
        break;
      }

      case "tool_call_count": {
        const [toolName, count] = expected;
        const actualCalls = toolUsage[toolName]?.call_count || 0;
        passed = actualCalls === count;
        details = passed
          ? `Tool ${toolName} called exactly ${count} times`
          : `Tool ${toolName} called ${actualCalls} times (expected ${count})`;
        break;
      }

      case "total_tool_calls": {
        const [min, max] = expected;
        const minCalls = typeof min === "number" ? min : 0;
        const maxCalls = typeof max === "number" ? max : Infinity;
        passed = toolCalls >= minCalls && toolCalls <= maxCalls;
        details = passed
          ? `Total tool calls (${toolCalls}) is within ${minCalls}-${maxCalls} range`
          : `Total tool calls (${toolCalls}) is outside ${minCalls}-${maxCalls} range`;
        break;
      }

      case "tool_call_less_than": {
        const [toolName, max] = expected;
        const calls = toolUsage[toolName]?.call_count || 0;
        passed = calls < max;
        details = passed
          ? `Tool ${toolName} called ${calls} times (< ${max})`
          : `Tool ${toolName} called ${calls} times (>= ${max}, exceeded limit)`;
        break;
      }

      case "tool_call_sequence": {
        const expectedSequence = expected;
        const actualSequence = context.toolCallSequence || [];

        // Simple sequence check
        let sequenceMatch = true;
        const minLength = Math.min(expectedSequence.length, actualSequence.length);

        for (let i = 0; i < minLength; i++) {
          if (expectedSequence[i] !== actualSequence[i]) {
            sequenceMatch = false;
            break;
          }
        }

        passed = sequenceMatch && expectedSequence.length <= actualSequence.length;
        details = passed
          ? `Tool call sequence matches expected pattern`
          : `Tool call sequence does not match expected pattern`;
        break;
      }

      case "only_tools": {
        const allowedTools = new Set(expected);
        const usedTools = Object.keys(toolUsage);

        const disallowed = usedTools.filter(t => !allowedTools.has(t));
        passed = disallowed.length === 0;

        if (passed) {
          details = `Only allowed tools were used: ${Array.from(allowedTools).join(", ")}`;
        } else {
          details = `Disallowed tools were used: ${disallowed.join(", ")}`;
        }
        break;
      }

      default:
        passed = false;
        details = `Unknown condition: ${condition}`;
    }

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      criteria_results: [
        {
          dimension: "correctness",
          passed,
          score: passed ? 1.0 : 0.0,
          notes: details
        }
      ],
      human_review_required: !passed
    };
  }
};
