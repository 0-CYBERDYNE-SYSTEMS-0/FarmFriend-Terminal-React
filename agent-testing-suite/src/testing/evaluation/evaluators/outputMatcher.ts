import { Evaluator, EvaluationResult, ScenarioResult } from "../../types.js";

/**
 * Evaluate output-based assertions
 * Supports: contains, matches, equals, regex
 */
export const outputMatcher: Evaluator = {
  name: "output",
  evaluate: async (result: ScenarioResult, context: any): Promise<EvaluationResult> => {
    const { condition, expected } = context.assertion;

    // In a real implementation, we would need to capture actual output
    // For now, this is a simplified version
    const output = context.output || ""; // Would come from session logs

    let passed = false;
    let details = "";

    switch (condition) {
      case "contains":
        passed = output.includes(expected);
        details = passed
          ? `Output contains "${expected}"`
          : `Output does not contain "${expected}"`;
        break;

      case "does_not_contain":
        passed = !output.includes(expected);
        details = passed
          ? `Output does not contain "${expected}"`
          : `Output contains "${expected}" (should not)`;
        break;

      case "equals":
        passed = output === expected;
        details = passed
          ? `Output equals expected value`
          : `Output differs from expected value`;
        break;

      case "regex":
        try {
          const regex = new RegExp(expected);
          passed = regex.test(output);
          details = passed
            ? `Output matches regex pattern`
            : `Output does not match regex pattern`;
        } catch (err) {
          passed = false;
          details = `Invalid regex pattern: ${expected}`;
        }
        break;

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
