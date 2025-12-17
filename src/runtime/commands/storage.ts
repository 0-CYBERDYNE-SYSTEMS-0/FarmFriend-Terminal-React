import fs from "node:fs";
import path from "node:path";
import type { Command } from "./types.js";

/**
 * Create example commands for first-time users
 */
export function createExampleCommands(workspaceDir: string): void {
  const commandsDir = path.join(workspaceDir, "commands");
  fs.mkdirSync(commandsDir, { recursive: true });

  const examples: Record<string, string> = {
    "review.md": `---
description: "Review git changes and provide feedback"
argument-hint: "[scope]"
---

Review the current git diff and provide detailed feedback on:
1. Security issues
2. Performance concerns
3. Best practices violations
4. Code quality improvements

Focus area: \$1`,

    "test.md": `---
description: "Run all tests and analyze failures"
---

Run all tests in the project and provide:
1. Test results summary
2. Any failures or errors
3. Coverage analysis
4. Recommendations for improvement`,

    "deploy.md": `---
description: "Deploy to production following standard process"
argument-hint: "[environment]"
---

Deploy the current project to \$1 (or production) following our standard deployment process:
1. Run all tests to ensure they pass
2. Build the project
3. Create deployment package
4. Deploy to environment
5. Verify deployment success
6. Document deployment in changelog`,

    "document.md": `---
description: "Generate or update project documentation"
argument-hint: "[section]"
---

Generate or update documentation for \$1 (or the entire project).
Focus on:
1. Clear, concise explanations
2. Code examples where appropriate
3. Common use cases and patterns
4. Troubleshooting section if needed`
  };

  for (const [filename, content] of Object.entries(examples)) {
    const filePath = path.join(commandsDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, "utf8");
    }
  }
}
