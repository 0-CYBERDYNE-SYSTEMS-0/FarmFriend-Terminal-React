import { EvaluatorPlugin, EvaluationResult, ScenarioResult } from "../../../types.js";

/**
 * Rule Engine Plugin
 * Evaluates complex business rules with if-then-else logic
 * Inspired by enterprise validation systems
 */

interface RuleEngineConfig {
  rules: Rule[];
  strictMode?: boolean;
}

interface Rule {
  name: string;
  description: string;
  conditions: Condition[];
  action: Action;
}

interface Condition {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex" | "in";
  value: any;
  logicalOperator?: "and" | "or";
}

interface Action {
  type: "pass" | "fail" | "score";
  score?: number;
  message?: string;
  requireReview?: boolean;
}

interface RuleEngineAssertion {
  type: "rule_engine";
  rule_set: string;  // Reference to predefined rule set
  custom_rules?: Rule[];  // Or inline rules
  context?: Record<string, any>;  // Additional context variables
}

export const ruleEnginePlugin: EvaluatorPlugin = {
  name: "rule_engine",
  version: "1.0.0",
  description: "Evaluates complex business rules with if-then-else logic",
  supported_types: ["rule_engine"],
  complexity: "medium",

  async initialize(config: RuleEngineConfig) {
    console.log(`Initializing Rule Engine with ${config.rules?.length || 0} rules`);

    // Validate rules
    if (config.rules) {
      const validation = this.validateRules(config.rules);
      if (!validation.valid) {
        throw new Error(`Invalid rules: ${validation.errors.join(", ")}`);
      }
    }
  },

  validate(assertion: RuleEngineAssertion) {
    const errors: string[] = [];

    if (!assertion.rule_set && !assertion.custom_rules) {
      errors.push("rule_engine requires 'rule_set' or 'custom_rules'");
    }

    if (assertion.custom_rules) {
      const validation = this.validateRules(assertion.custom_rules);
      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  async evaluate(assertion: RuleEngineAssertion, context: any): Promise<EvaluationResult> {
    const { pluginConfig } = context;
    const config = pluginConfig as RuleEngineConfig;

    // Get rules to evaluate
    const rules = assertion.custom_rules || config.rules || [];

    if (rules.length === 0) {
      return {
        passed: false,
        score: 0,
        criteria_results: [
          {
            dimension: "rule_engine",
            passed: false,
            score: 0,
            notes: "No rules to evaluate"
          }
        ],
        human_review_required: true
      };
    }

    // Build evaluation context
    const evalContext = {
      ...context,
      ...assertion.context
    };

    // Evaluate all rules
    const results: Array<{
      rule: Rule;
      matched: boolean;
      action: Action;
      score: number;
      message: string;
    }> = [];

    for (const rule of rules) {
      const result = this.evaluateRule(rule, evalContext);
      results.push(result);
    }

    // Aggregate results
    const passed = results.every(r => r.matched);
    const score = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      passed,
      score,
      criteria_results: results.map(r => ({
        dimension: `rule_${r.rule.name}`,
        passed: r.matched,
        score: r.score,
        notes: `${r.rule.name}: ${r.message}`
      })),
      human_review_required: results.some(r => r.action.requireReview)
    };
  },

  evaluateRule(rule: Rule, context: any): any {
    // Evaluate all conditions
    let matched = true;

    for (let i = 0; i < rule.conditions.length; i++) {
      const cond = rule.conditions[i];
      const nextCond = rule.conditions[i + 1];
      const nextOperator = nextCond?.logicalOperator || "and";

      const condMatched = this.evaluateCondition(cond, context);

      if (nextOperator === "and") {
        matched = matched && condMatched;
        if (!matched) break; // Short-circuit
      } else {
        matched = matched || condMatched;
        if (matched) break; // Short-circuit
      }
    }

    // Execute action based on match
    const action = rule.action;

    return {
      rule,
      matched,
      action,
      score: action.type === "score" ? action.score || (matched ? 1 : 0) : (matched ? 1 : 0),
      message: action.message || (matched ? "Rule matched" : "Rule not matched")
    };
  },

  evaluateCondition(condition: Condition, context: any): boolean {
    const value = this.getFieldValue(context, condition.field);

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "ne":
        return value !== condition.value;
      case "gt":
        return value > condition.value;
      case "gte":
        return value >= condition.value;
      case "lt":
        return value < condition.value;
      case "lte":
        return value <= condition.value;
      case "contains":
        return String(value).includes(String(condition.value));
      case "regex":
        const regex = new RegExp(condition.value);
        return regex.test(String(value));
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  },

  getFieldValue(context: any, field: string): any {
    // Support dot notation (e.g., "result.duration_ms")
    const parts = field.split(".");
    let value = context;

    for (const part of parts) {
      if (value == null) return null;
      value = value[part];
    }

    return value;
  },

  validateRules(rules: Rule[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.name) {
        errors.push("Rule missing 'name'");
      }

      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push(`Rule '${rule.name}' missing conditions`);
      }

      for (const cond of rule.conditions || []) {
        if (!cond.field) {
          errors.push(`Rule '${rule.name}' condition missing 'field'`);
        }
        if (!cond.operator) {
          errors.push(`Rule '${rule.name}' condition missing 'operator'`);
        }
      }

      if (!rule.action || !rule.action.type) {
        errors.push(`Rule '${rule.name}' missing action type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

// Example rules
export const exampleRules: Rule[] = [
  {
    name: "duration_check",
    description: "Ensure scenario completes within expected time",
    conditions: [
      {
        field: "result.duration_ms",
        operator: "lte",
        value: 30000,
        logicalOperator: "and"
      },
      {
        field: "result.tool_calls",
        operator: "lte",
        value: 10,
        logicalOperator: "and"
      }
    ],
    action: {
      type: "pass",
      message: "Scenario completed efficiently"
    }
  },
  {
    name: "error_count_check",
    description: "Fail if too many errors",
    conditions: [
      {
        field: "result.errors.length",
        operator: "gt",
        value: 0
      }
    ],
    action: {
      type: "fail",
      message: "Scenario encountered errors",
      requireReview: true
    }
  },
  {
    name: "turn_limit_check",
    description: "Score based on number of turns",
    conditions: [
      {
        field: "result.turn_count",
        operator: "lte",
        value: 5,
        logicalOperator: "and"
      },
      {
        field: "result.turn_count",
        operator: "gte",
        value: 1
      }
    ],
    action: {
      type: "score",
      score: 1.0,
      message: "Optimal turn count"
    }
  },
  {
    name: "efficiency_scoring",
    description: "Calculate efficiency score",
    conditions: [
      {
        field: "result.duration_ms",
        operator: "lte",
        value: 10000
      }
    ],
    action: {
      type: "score",
      score: 1.0,
      message: "High efficiency"
    }
  }
];

export default ruleEnginePlugin;
