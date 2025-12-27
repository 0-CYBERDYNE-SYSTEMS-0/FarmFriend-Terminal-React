import { Evaluator, EvaluationResult, ScenarioResult } from "../../types.js";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Evaluate filesystem-based assertions
 * Supports: file_exists, file_contains, directory_exists, file_count
 */
export const fileSystemChecker: Evaluator = {
  name: "filesystem",
  evaluate: async (result: ScenarioResult, context: any): Promise<EvaluationResult> => {
    const { condition, expected } = context.assertion;
    const workspaceDir = context.workspaceDir;

    let passed = false;
    let details = "";

    try {
      switch (condition) {
        case "file_exists": {
          const filePath = path.isAbsolute(expected)
            ? expected
            : path.join(workspaceDir, expected);

          const exists = await fs.access(filePath).then(() => true).catch(() => false);
          passed = exists;
          details = passed
            ? `File exists: ${expected}`
            : `File does not exist: ${expected}`;
          break;
        }

        case "file_does_not_exist": {
          const filePath = path.isAbsolute(expected)
            ? expected
            : path.join(workspaceDir, expected);

          const exists = await fs.access(filePath).then(() => true).catch(() => false);
          passed = !exists;
          details = passed
            ? `File correctly does not exist: ${expected}`
            : `File exists but should not: ${expected}`;
          break;
        }

        case "directory_exists": {
          const dirPath = path.isAbsolute(expected)
            ? expected
            : path.join(workspaceDir, expected);

          const exists = await fs.access(dirPath).then(() => true).catch(() => false);
          const stat = exists ? await fs.stat(dirPath) : null;
          passed = exists && stat?.isDirectory();
          details = passed
            ? `Directory exists: ${expected}`
            : `Directory does not exist: ${expected}`;
          break;
        }

        case "file_contains": {
          const [filePath, expectedContent] = expected;
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(workspaceDir, filePath);

          const content = await fs.readFile(fullPath, "utf-8");
          passed = content.includes(expectedContent);
          details = passed
            ? `File contains expected content: ${filePath}`
            : `File does not contain expected content: ${filePath}`;
          break;
        }

        case "file_matches_pattern": {
          const [filePath, pattern] = expected;
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(workspaceDir, filePath);

          const content = await fs.readFile(fullPath, "utf-8");
          try {
            const regex = new RegExp(pattern);
            passed = regex.test(content);
            details = passed
              ? `File content matches pattern: ${filePath}`
              : `File content does not match pattern: ${filePath}`;
          } catch (err) {
            passed = false;
            details = `Invalid regex pattern: ${pattern}`;
          }
          break;
        }

        case "file_count": {
          const [directory, count, pattern = "*"] = expected;
          const dirPath = path.isAbsolute(directory)
            ? directory
            : path.join(workspaceDir, directory);

          const files = await fs.readdir(dirPath);
          const matchedFiles = files.filter(f => {
            // Simple glob pattern matching (supports * only)
            const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
            return regex.test(f);
          });

          passed = matchedFiles.length === count;
          details = passed
            ? `File count matches: ${count} files in ${directory}`
            : `File count mismatch: expected ${count}, found ${matchedFiles.length} in ${directory}`;
          break;
        }

        default:
          passed = false;
          details = `Unknown condition: ${condition}`;
      }
    } catch (err: any) {
      passed = false;
      details = `Error checking filesystem: ${err.message}`;
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
