import yaml from "yaml";
import { v4 as uuidv4 } from "uuid";
import { TestScenario, TestSuite } from "../types.js";

/**
 * Dynamic scenario generator inspired by Anthropic's Bloom framework
 * Pipeline: Understanding → Ideation → Rollout → Judgment
 */

interface ScenarioTemplate {
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  domain: string;
  variables: Record<string, string[]>;
  prompts: string[];
  evaluation: any;
  timeout_minutes: number;
}

interface GenerationConfig {
  variationCount: number;
  difficulties: string[];
  domains: string[];
  templatesDir: string;
}

interface GeneratedScenario {
  template: ScenarioTemplate;
  variables: Record<string, string>;
  id: string;
}

/**
 * Generate scenarios from templates with variable substitution
 */
export class ScenarioGenerator {
  private config: GenerationConfig;

  constructor(config: Partial<GenerationConfig> = {}) {
    this.config = {
      variationCount: config.variationCount || 10,
      difficulties: config.difficulties || ["easy", "medium", "hard"],
      domains: config.domains || ["file_ops", "web_search", "analysis", "multi_agent"],
      templatesDir: config.templatesDir || "./templates"
    };
  }

  /**
   * Pipeline Step 1: Understanding - Parse and analyze templates
   */
  async understandTemplates(): Promise<ScenarioTemplate[]> {
    const { promises } = await import("node:fs/promises");
    const templatesPath = `${this.config.templatesDir}/*.yaml`;

    try {
      const files = await promises.readdir(this.config.templatesDir);
      const yamlFiles = files.filter(f => f.endsWith(".yaml") || f.endsWith(".yml"));

      const templates: ScenarioTemplate[] = [];

      for (const file of yamlFiles) {
        const content = await promises.readFile(
          `${this.config.templatesDir}/${file}`,
          "utf-8"
        );
        const template = yaml.parse(content) as ScenarioTemplate;
        templates.push(template);
      }

      return templates;
    } catch (err) {
      console.error("Failed to understand templates:", err);
      return [];
    }
  }

  /**
   * Pipeline Step 2: Ideation - Generate variations
   */
  async ideate(templates: ScenarioTemplate[]): Promise<GeneratedScenario[]> {
    const generated: GeneratedScenario[] = [];

    for (const template of templates) {
      for (const difficulty of this.config.difficulties) {
        for (const domain of this.config.domains) {
          for (let i = 0; i < this.config.variationCount; i++) {
            // Substitute variables
            const variables = this.substituteVariables(template);

            generated.push({
              template,
              variables,
              id: `gen_${uuidv4()}`
            });
          }
        }
      }
    }

    return generated;
  }

  /**
   * Substitute template variables with random values
   */
  private substituteVariables(template: ScenarioTemplate): Record<string, string> {
    const variables: Record<string, string> = {};

    for (const [key, values] of Object.entries(template.variables)) {
      const randomValue = values[Math.floor(Math.random() * values.length)];
      variables[key] = this.expandVariable(randomValue);
    }

    return variables;
  }

  /**
   * Expand variable with contextual values
   */
  private expandVariable(value: string): string {
    // Date variables
    value = value.replace(/\${date}/g, () => {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      return date.toISOString().split("T")[0];
    });

    // Number variables
    value = value.replace(/\${number}/g, () =>
      Math.floor(Math.random() * 1000).toString()
    );

    // File name variables
    value = value.replace(/\${filename}/g, () =>
      `test_file_${Math.random().toString(36).substring(7)}.txt`
    );

    // Path variables
    value = value.replace(/\${path}/g, () =>
      `/tmp/test/${Math.random().toString(36).substring(7)}`
    );

    // User variables
    const users = ["alice", "bob", "charlie", "diana"];
    value = value.replace(/\${user}/g, () =>
      users[Math.floor(Math.random() * users.length)]
    );

    return value;
  }

  /**
   * Pipeline Step 3: Rollout - Create executable scenarios
   */
  async rollout(generated: GeneratedScenario[]): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    for (const gen of generated) {
      // Expand prompts with variables
      const expandedPrompts = gen.template.prompts.map(prompt =>
        this.expandPrompt(prompt, gen.variables)
      );

      // Create scenario
      const scenario: TestScenario = {
        name: `${gen.template.name} - ${gen.id.substring(0, 8)}`,
        description: gen.template.description,
        prompts: expandedPrompts,
        evaluation: {
          ...gen.template.evaluation,
          // Expand expected values in assertions
          assertions: this.expandAssertions(
            gen.template.evaluation.assertions || [],
            gen.variables
          )
        },
        timeout_minutes: gen.template.timeout_minutes,
        expected_duration_minutes: gen.template.expected_duration_minutes
      };

      scenarios.push(scenario);
    }

    return scenarios;
  }

  /**
   * Expand prompt template with variables
   */
  private expandPrompt(prompt: string, variables: Record<string, string>): string {
    let expanded = prompt;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\$\\{${key}\\}`, "g");
      expanded = expanded.replace(regex, value);
    }

    return expanded;
  }

  /**
   * Expand expected values in assertions
   */
  private expandAssertions(assertions: any[], variables: Record<string, string>): any[] {
    return assertions.map(assertion => ({
      ...assertion,
      expected: this.expandValue(assertion.expected, variables)
    }));
  }

  /**
   * Expand value with variables
   */
  private expandValue(expected: any, variables: Record<string, string>): any {
    if (typeof expected === "string") {
      return this.expandPrompt(expected, variables);
    }
    return expected;
  }

  /**
   * Pipeline Step 4: Judgment - Validate and filter scenarios
   */
  async judge(scenarios: TestScenario[]): Promise<TestScenario[]> {
    const valid: TestScenario[] = [];

    for (const scenario of scenarios) {
      // Validate required fields
      if (!scenario.name || !scenario.prompts || scenario.prompts.length === 0) {
        console.warn(`Invalid scenario: ${scenario.name}`);
        continue;
      }

      // Validate timeout
      if (scenario.timeout_minutes < 1 || scenario.timeout_minutes > 60) {
        console.warn(`Invalid timeout for scenario: ${scenario.name}`);
        continue;
      }

      // Validate evaluation
      if (!scenario.evaluation || !scenario.evaluation.rubric) {
        console.warn(`Missing evaluation config for scenario: ${scenario.name}`);
        continue;
      }

      valid.push(scenario);
    }

    return valid;
  }

  /**
   * Execute full generation pipeline
   */
  async generate(): Promise<TestScenario[]> {
    console.log("🔍 Step 1: Understanding - Analyzing templates...");
    const templates = await this.understandTemplates();
    console.log(`   Found ${templates.length} templates`);

    console.log("💡 Step 2: Ideation - Generating variations...");
    const generated = await this.ideate(templates);
    console.log(`   Generated ${generated.length} variations`);

    console.log("🚀 Step 3: Rollout - Creating executable scenarios...");
    const scenarios = await this.rollout(generated);
    console.log(`   Created ${scenarios.length} scenarios`);

    console.log("⚖️  Step 4: Judgment - Validating scenarios...");
    const valid = await this.judge(scenarios);
    console.log(`   ${valid.length} valid, ${scenarios.length - valid.length} invalid`);

    return valid;
  }

  /**
   * Save generated scenarios to file
   */
  async saveToFile(scenarios: TestScenario[], outputPath: string): Promise<void> {
    const suite: TestSuite = {
      name: "Dynamically Generated Suite",
      description: `Auto-generated scenarios (${new Date().toISOString()})`,
      category: "long-horizon",
      version: "1.0.0",
      scenarios
    };

    const yamlContent = yaml.stringify(suite, { indent: 2 });

    const { promises } = await import("node:fs/promises");
    await promises.mkdir(outputPath.split("/").slice(0, -1).join("/"), { recursive: true });
    await promises.writeFile(outputPath, yamlContent, "utf-8");

    console.log(`✅ Saved ${scenarios.length} scenarios to ${outputPath}`);
  }

  /**
   * Generate scenarios with difficulty calibration
   */
  async generateWithCalibration(
    targetDifficulty: "easy" | "medium" | "hard"
  ): Promise<TestScenario[]> {
    const allScenarios = await this.generate();

    // Filter by target difficulty
    const calibrated = allScenarios.filter(s => {
      // Estimate difficulty based on prompt complexity and evaluation
      const promptComplexity = s.prompts.reduce((sum, p) => sum + p.length, 0);
      const evaluationComplexity = (s.evaluation.assertions || []).length;

      const score = promptComplexity + evaluationComplexity * 10;

      if (targetDifficulty === "easy") return score < 500;
      if (targetDifficulty === "medium") return score >= 500 && score < 1500;
      return score >= 1500;
    });

    return calibrated;
  }

  /**
   * Detect contamination (overlap with training data)
   */
  async detectContamination(scenarios: TestScenario[], trainingData: string[]): Promise<string[]> {
    const contaminated: string[] = [];

    for (const scenario of scenarios) {
      const scenarioText = JSON.stringify(scenario).toLowerCase();

      for (const trainExample of trainingData) {
        const trainLower = trainExample.toLowerCase();

        // Check for significant overlap (Jaccard similarity)
        const overlap = this.calculateJaccardSimilarity(scenarioText, trainLower);

        if (overlap > 0.8) {
          contaminated.push(scenario.name);
          break;
        }
      }
    }

    return contaminated;
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}

/**
 * Example scenario template
 */
export const exampleTemplate: ScenarioTemplate = {
  name: "file-analysis-template",
  description: "Analyze files and extract information",
  difficulty: "medium",
  domain: "file_ops",
  variables: {
    filename: ["data.json", "output.txt", "metrics.csv"],
    target: ["count", "sum", "average"],
    pattern: ["error", "warning", "success"]
  },
  prompts: [
    "Read the file ${filename} and tell me how many ${target} values you find.",
    "What ${pattern} messages are present in the log?"
  ],
  evaluation: {
    rubric: "basic-completion",
    assertions: [
      {
        type: "filesystem",
        condition: "file_exists",
        expected: "${filename}"
      },
      {
        type: "output",
        condition: "contains",
        expected: "${target}"
      }
    ]
  },
  timeout_minutes: 5,
  expected_duration_minutes: 2
};
