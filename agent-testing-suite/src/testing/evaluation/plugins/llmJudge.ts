import { EvaluatorPlugin, EvaluationResult, ScenarioResult } from "../../../types.js";

/**
 * LLM Judge Plugin
 * Uses another LLM to evaluate response quality
 * Inspired by Anthropic Bloom's LLM-as-judge approach
 * 0.86 Spearman correlation with human judgments
 */

interface LLMJudgeConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  criteria?: string[];
}

interface LLMJudgeAssertion {
  type: "llm_judge";
  judge_prompt: string;
  grading_rubric: string;
  expected_quality: "high" | "medium" | "low";
}

export const llmJudgePlugin: EvaluatorPlugin = {
  name: "llm_judge",
  version: "1.0.0",
  description: "Uses another LLM to evaluate response quality",
  supported_types: ["llm_judge"],
  complexity: "complex",

  async initialize(config: LLMJudgeConfig) {
    console.log(`Initializing LLM Judge with model: ${config.model}`);

    // Validate API key
    if (!config.apiKey) {
      throw new Error("LLM Judge requires apiKey in config");
    }

    // Default criteria
    if (!config.criteria) {
      config.criteria = [
        "Correctness",
        "Completeness",
        "Clarity",
        "Tone",
        "Safety"
      ];
    }
  },

  validate(assertion: LLMJudgeAssertion) {
    const errors: string[] = [];

    if (!assertion.judge_prompt) {
      errors.push("llm_judge requires 'judge_prompt'");
    }

    if (!assertion.grading_rubric) {
      errors.push("llm_judge requires 'grading_rubric'");
    }

    if (
      !["high", "medium", "low"].includes(assertion.expected_quality)
    ) {
      errors.push("expected_quality must be 'high', 'medium', or 'low'");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  async evaluate(assertion: LLMJudgeAssertion, context: any): Promise<EvaluationResult> {
    const { pluginConfig } = context;
    const config = pluginConfig as LLMJudgeConfig;

    // Get agent output from context
    const agentOutput = context.output || "";
    const agentPrompt = context.prompt || "";

    // Build judge prompt
    const judgePrompt = this.buildJudgePrompt(
      assertion.judge_prompt,
      assertion.grading_rubric,
      agentPrompt,
      agentOutput,
      assertion.expected_quality,
      config.criteria || []
    );

    // Call LLM for judgment
    let judgment: string;

    try {
      judgment = await this.callLLM(judgePrompt, config);
    } catch (err: any) {
      return {
        passed: false,
        score: 0,
        criteria_results: [
          {
            dimension: "llm_judge",
            passed: false,
            score: 0,
            notes: `LLM Judge failed: ${err.message}`
          }
        ],
        human_review_required: true
      };
    }

    // Parse judgment
    const parsed = this.parseJudgment(judgment);

    // Determine pass/fail based on expected quality
    const passed = this.checkQuality(parsed, assertion.expected_quality);

    return {
      passed,
      score: parsed.overall_score,
      criteria_results: [
        {
          dimension: "llm_judge",
          passed,
          score: parsed.overall_score,
          notes: parsed.reasoning
        }
      ],
      human_review_required: !passed || parsed.overall_score < 0.7
    };
  },

  buildJudgePrompt(
    judgePrompt: string,
    gradingRubric: string,
    agentPrompt: string,
    agentOutput: string,
    expectedQuality: string,
    criteria: string[]
  ): string {
    return `
You are an expert AI evaluator. Your task is to evaluate an AI agent's response.

## Agent's Prompt
${agentPrompt}

## Agent's Response
${agentOutput}

## Evaluation Criteria
${criteria.map(c => `- ${c}`).join("\n")}

## Grading Rubric
${gradingRubric}

## Expected Quality
The expected quality level is: ${expectedQuality.toUpperCase()}

## Instructions
1. Evaluate the response against each criterion
2. Provide a score for each criterion (0.0 to 1.0)
3. Calculate overall score (weighted average)
4. Provide brief reasoning
5. Compare to expected quality and determine if response meets standards

## Format
Your response must be in JSON format:
{
  "criterion_scores": {
    "Criterion1": 0.85,
    "Criterion2": 0.70,
    ...
  },
  "overall_score": 0.78,
  "meets_expected_quality": true,
  "reasoning": "Brief explanation of your judgment"
}

## Evaluation
${judgePrompt}

Provide your judgment in the JSON format above:
`;
  },

  async callLLM(prompt: string, config: LLMJudgeConfig): Promise<string> {
    // Use fetch for API call
    const baseUrl = config.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are an expert AI evaluator. Always respond in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  parseJudgment(judgment: string): any {
    try {
      // Extract JSON from response (in case of extra text)
      const jsonMatch = judgment.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in LLM response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        criterion_scores: parsed.criterion_scores || {},
        overall_score: parsed.overall_score || 0.5,
        meets_expected_quality: parsed.meets_expected_quality || false,
        reasoning: parsed.reasoning || "No reasoning provided"
      };
    } catch (err: any) {
      console.warn("Failed to parse LLM judgment:", err);
      // Return default judgment
      return {
        criterion_scores: {},
        overall_score: 0.5,
        meets_expected_quality: false,
        reasoning: `Failed to parse: ${err.message}`
      };
    }
  },

  checkQuality(parsed: any, expectedQuality: string): boolean {
    const score = parsed.overall_score;

    if (expectedQuality === "high") {
      return score >= 0.8;
    } else if (expectedQuality === "medium") {
      return score >= 0.6;
    } else {
      return score >= 0.4; // low quality
    }
  }
};

export default llmJudgePlugin;
