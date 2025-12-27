import { Evaluator, EvaluationResult, ScenarioResult } from "../../types.js";

/**
 * Evaluate duration-based assertions
 * Supports: less_than, greater_than, between, equals
 */
export const durationChecker: Evaluator = {
  name: "duration",
  evaluate: async (result: ScenarioResult, context: any): Promise<EvaluationResult> => {
    const { condition, expected } = context.assertion;
    const actualDurationMs = result.duration_ms;

    let passed = false;
    let details = "";

    switch (condition) {
      case "less_than": {
        const maxMs = typeof expected === "number" ? expected * 1000 : expected;
        passed = actualDurationMs < maxMs;
        details = passed
          ? `Duration ${(actualDurationMs / 1000).toFixed(2)}s < ${expected}s`
          : `Duration ${(actualDurationMs / 1000).toFixed(2)}s >= ${expected}s (exceeded limit)`;
        break;
      }

      case "greater_than": {
        const minMs = typeof expected === "number" ? expected * 1000 : expected;
        passed = actualDurationMs > minMs;
        details = passed
          ? `Duration ${(actualDurationMs / 1000).toFixed(2)}s > ${expected}s`
          : `Duration ${(actualDurationMs / 1000).toFixed(2)}s <= ${expected}s (below minimum)`;
        break;
      }

      case "between": {
        const [minSeconds, maxSeconds] = expected;
        const minMs = minSeconds * 1000;
        const maxMs = maxSeconds * 1000;
        passed = actualDurationMs >= minMs && actualDurationMs <= maxMs;
        details = passed
          ? `Duration ${(actualDurationMs / 1000).toFixed(2)}s is between ${minSeconds}s and ${maxSeconds}s`
          : `Duration ${(actualDurationMs / 1000).toFixed(2)}s is outside ${minSeconds}s - ${maxSeconds}s range`;
        break;
      }

      case "equals": {
        const targetMs = typeof expected === "number" ? expected * 1000 : expected;
        passed = actualDurationMs === targetMs;
        details = passed
          ? `Duration ${(actualDurationMs / 1000).toFixed(2)}s equals ${expected}s`
          : `Duration ${(actualDurationMs / 1000).toFixed(2)}s does not equal ${expected}s`;
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
          dimension: "efficiency",
          passed,
          score: passed ? 1.0 : 0.0,
          notes: details
        }
      ],
      human_review_required: !passed
    };
  }
};
