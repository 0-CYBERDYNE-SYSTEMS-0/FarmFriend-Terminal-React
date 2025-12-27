import { Rubric } from "../../types.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";

/**
 * Registry for evaluation rubrics
 */
export class RubricRegistry {
  private rubricsDir: string;
  private cache: Map<string, Rubric> = new Map();

  constructor(workspaceDir: string) {
    this.rubricsDir = path.join(
      workspaceDir,
      "tests",
      "suites",
      "rubrics"
    );
  }

  /**
   * Load a rubric by ID
   */
  async loadRubric(id: string): Promise<Rubric | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const rubricPath = path.join(this.rubricsDir, `${id}.yaml`);

    try {
      const content = await fs.readFile(rubricPath, "utf-8");
      const rubric = yaml.parse(content) as Rubric;

      this.cache.set(id, rubric);
      return rubric;
    } catch {
      return null;
    }
  }

  /**
   * List all available rubrics
   */
  async listRubrics(): Promise<Rubric[]> {
    const rubrics: Rubric[] = [];

    try {
      const files = await fs.readdir(this.rubricsDir);
      const yamlFiles = files.filter(f => f.endsWith(".yaml"));

      for (const file of yamlFiles) {
        const id = file.replace(".yaml", "");
        const rubric = await this.loadRubric(id);
        if (rubric) {
          rubrics.push(rubric);
        }
      }
    } catch {
      // Directory may not exist yet
    }

    return rubrics;
  }

  /**
   * Validate rubric structure
   */
  validateRubric(rubric: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rubric.id) {
      errors.push("Rubric must have an 'id'");
    }

    if (!rubric.name) {
      errors.push("Rubric must have a 'name'");
    }

    if (!rubric.criteria || !Array.isArray(rubric.criteria)) {
      errors.push("Rubric must have 'criteria' array");
    } else {
      rubric.criteria.forEach((c: any, idx: number) => {
        if (!c.dimension) {
          errors.push(`Criterion ${idx}: missing 'dimension'`);
        }
        if (typeof c.weight !== "number" || c.weight < 0 || c.weight > 1) {
          errors.push(`Criterion ${idx}: 'weight' must be number between 0-1`);
        }
        if (!c.description) {
          errors.push(`Criterion ${idx}: missing 'description'`);
        }
      });

      // Check weights sum to 1.0 (or close)
      const totalWeight = rubric.criteria.reduce((sum: number, c: any) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        errors.push(`Criterion weights must sum to 1.0 (currently ${totalWeight.toFixed(2)})`);
      }
    }

    if (!rubric.scoring || !["scale1-5", "pass_fail", "percentage"].includes(rubric.scoring)) {
      errors.push("Rubric must have valid 'scoring' (scale1-5, pass_fail, percentage)");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply rubric to evaluation results
   */
  applyRubric(
    rubric: Rubric,
    assertionResults: any[]
  ): { passed: boolean; score: number; dimensionScores: any[] } {
    let totalScore = 0;
    const dimensionScores: any[] = [];

    // Group by dimension
    const dimensionGroups: Record<string, any[]> = {};
    for (const result of assertionResults) {
      const dimension = result.dimension || "unknown";
      if (!dimensionGroups[dimension]) {
        dimensionGroups[dimension] = [];
      }
      dimensionGroups[dimension].push(result);
    }

    // Score each dimension
    for (const criterion of rubric.criteria) {
      const dimension = criterion.dimension;
      const results = dimensionGroups[dimension] || [];

      if (results.length === 0) {
        // No assertions for this dimension - use max score if everything passed
        dimensionScores.push({
          dimension,
          weight: criterion.weight,
          score: 1.0,
          note: "No assertions, assuming pass"
        });
        totalScore += criterion.weight * 1.0;
      } else {
        // Calculate score from results
        let dimScore = 0;
        let passedCount = 0;

        for (const result of results) {
          if (result.passed) {
            passedCount++;
          }
          dimScore += result.score;
        }

        // Average score for this dimension
        const avgScore = results.length > 0 ? dimScore / results.length : 0;

        dimensionScores.push({
          dimension,
          weight: criterion.weight,
          score: avgScore,
          passedCount,
          totalAssertions: results.length
        });

        totalScore += criterion.weight * avgScore;
      }
    }

    // Convert score based on rubric type
    let finalScore = totalScore;

    if (rubric.scoring === "pass_fail") {
      finalScore = totalScore >= 0.5 ? 1.0 : 0.0;
    } else if (rubric.scoring === "scale1-5") {
      finalScore = Math.round(totalScore * 5);
    }
    // percentage is just 0-1 scale

    const passed = finalScore >= 0.5;

    return {
      passed,
      score: finalScore,
      dimensionScores
    };
  }
}
