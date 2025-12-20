import fs from "node:fs";
import path from "node:path";
import { ffHomeDir } from "../config/ffHome.js";
import type { ValidationIssue } from "./doctor.js";

const CRITICAL_DIRECTORIES = [
  "memory_core",
  "memory_core/scheduled_tasks",
  "logs",
  "logs/sessions",
  "logs/hooks",
  "sessions"
];

export async function quickHealthCheck(workspaceDir: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!fs.existsSync(workspaceDir)) {
    return issues;
  }

  for (const dir of CRITICAL_DIRECTORIES) {
    const fullPath = path.join(workspaceDir, dir);
    if (!fs.existsSync(fullPath)) {
      issues.push({
        type: 'missing_directory',
        severity: 'warning',
        path: fullPath,
        message: `Missing directory: ${dir}`
      });
    }
  }

  const legacyHome = ffHomeDir();
  const legacyAgents = path.join(legacyHome, 'agents');
  const legacyCommands = path.join(legacyHome, 'commands');

  if (fs.existsSync(legacyAgents)) {
    const files = fs.readdirSync(legacyAgents);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length > 0) {
      issues.push({
        type: 'legacy_data',
        severity: 'warning',
        path: legacyAgents,
        message: `Found legacy agents data (${jsonFiles.length} file(s)) - consider running /doctor to migrate`
      });
    }
  }

  if (fs.existsSync(legacyCommands)) {
    const files = fs.readdirSync(legacyCommands);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    if (mdFiles.length > 0) {
      issues.push({
        type: 'legacy_data',
        severity: 'warning',
        path: legacyCommands,
        message: `Found legacy commands data (${mdFiles.length} file(s)) - consider running /doctor to migrate`
      });
    }
  }

  return issues;
}
