import { Evaluator, EvaluationResult, ScenarioResult } from "../../types.js";
import { outputMatcher } from "./outputMatcher.js";
import { fileSystemChecker } from "./fileSystemChecker.js";
import { durationChecker } from "./durationChecker.js";
import { toolPatternValidator } from "./toolPatternValidator.js";

/**
 * Registry of all built-in evaluators
 */
const evaluators: Record<string, Evaluator> = {
  "output": outputMatcher,
  "filesystem": fileSystemChecker,
  "duration": durationChecker,
  "tool_pattern": toolPatternValidator
};

/**
 * Get evaluator by name
 */
export function getEvaluator(name: string): Evaluator | null {
  return evaluators[name] || null;
}

/**
 * List all available evaluators
 */
export function listEvaluators(): string[] {
  return Object.keys(evaluators);
}

/**
 * Run all assertions for a scenario
 */
export async function runAssertions(
  result: ScenarioResult,
  assertions: any[],
  context: { workspaceDir: string; [key: string]: any }
): Promise<{ passed: boolean; results: any[] }> {
  const assertionResults: any[] = [];
  let allPassed = true;

  for (const assertion of assertions) {
    const evaluator = getEvaluator(assertion.type);
    if (!evaluator) {
      console.warn(`Unknown assertion type: ${assertion.type}`);
      continue;
    }

    const evalResult = await evaluator.evaluate(result, {
      ...context,
      assertion
    });

    assertionResults.push({
      type: assertion.type,
      condition: assertion.condition,
      expected: assertion.expected,
      ...evalResult
    });

    if (!evalResult.passed) {
      allPassed = false;
    }
  }

  return {
    passed: allPassed,
    results: assertionResults
  };
}

export { evaluators };
