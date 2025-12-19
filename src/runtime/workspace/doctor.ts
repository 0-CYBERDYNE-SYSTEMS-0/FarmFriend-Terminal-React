import fs from "node:fs";
import path from "node:path";
import { ffHomeDir } from "../config/ffHome.js";

export type ValidationIssueType = 'missing_directory' | 'legacy_data' | 'misplaced_file' | 'invalid_structure';
export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationIssue = {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  path: string;
  message: string;
  expectedPath?: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  scannedPaths: string[];
  timestamp: string;
};

const CANONICAL_DIRECTORIES = [
  'memory_core',
  'memory_core/scheduled_tasks',
  'projects',
  'agents',
  'commands',
  'skills',
  'todos/sessions',
  'logs/sessions',
  'logs/hooks'
];

export function checkCanonicalStructure(workspaceDir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!fs.existsSync(workspaceDir)) {
    issues.push({
      type: 'missing_directory',
      severity: 'error',
      path: workspaceDir,
      message: `Workspace directory does not exist: ${workspaceDir}`
    });
    return issues;
  }

  try {
    fs.accessSync(workspaceDir, fs.constants.W_OK);
  } catch {
    issues.push({
      type: 'invalid_structure',
      severity: 'error',
      path: workspaceDir,
      message: `Workspace directory is not writable: ${workspaceDir}`
    });
    return issues;
  }

  for (const dir of CANONICAL_DIRECTORIES) {
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

  return issues;
}

export function checkLegacyWorkspace(workspaceDir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const legacyHome = ffHomeDir();

  const legacyPaths = [
    { dir: 'agents', pattern: '*.json' },
    { dir: 'commands', pattern: '*.md' },
    { dir: 'skills', pattern: null }
  ];

  for (const { dir, pattern } of legacyPaths) {
    const legacyPath = path.join(legacyHome, dir);

    if (fs.existsSync(legacyPath)) {
      const stats = fs.statSync(legacyPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(legacyPath);
        const filteredFiles = pattern
          ? files.filter(f => {
              const ext = path.extname(f);
              return pattern.replace('*', '') === ext;
            })
          : files;

        if (filteredFiles.length > 0) {
          const expectedPath = path.join(workspaceDir, dir);
          issues.push({
            type: 'legacy_data',
            severity: 'warning',
            path: legacyPath,
            message: `Found legacy ${dir} data in ${legacyPath} (${filteredFiles.length} file(s))`,
            expectedPath
          });
        }
      }
    }
  }

  const legacySessionSummary = path.join(legacyHome, 'session_summary.md');
  if (fs.existsSync(legacySessionSummary)) {
    const expectedPath = path.join(workspaceDir, 'memory_core', 'session_summary.md');
    issues.push({
      type: 'legacy_data',
      severity: 'warning',
      path: legacySessionSummary,
      message: `Found legacy session summary in ${legacySessionSummary}`,
      expectedPath
    });
  }

  const workspaceSessionSummary = path.join(workspaceDir, 'session_summary.md');
  if (fs.existsSync(workspaceSessionSummary)) {
    const expectedPath = path.join(workspaceDir, 'memory_core', 'session_summary.md');
    if (workspaceSessionSummary !== expectedPath) {
      issues.push({
        type: 'misplaced_file',
        severity: 'warning',
        path: workspaceSessionSummary,
        message: `session_summary.md should be in memory_core/`,
        expectedPath
      });
    }
  }

  return issues;
}

export async function validateWorkspace(workspaceDir: string): Promise<ValidationResult> {
  const scannedPaths: string[] = [workspaceDir];
  const issues: ValidationIssue[] = [];

  const structureIssues = checkCanonicalStructure(workspaceDir);
  issues.push(...structureIssues);

  const legacyIssues = checkLegacyWorkspace(workspaceDir);
  issues.push(...legacyIssues);

  scannedPaths.push(ffHomeDir());

  const ok = issues.every(issue => issue.severity !== 'error');

  return {
    ok,
    issues,
    scannedPaths,
    timestamp: new Date().toISOString()
  };
}

export function generateReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('Workspace Health Report');
  lines.push('======================');
  lines.push('');
  lines.push(`Scanned at: ${new Date(result.timestamp).toLocaleString()}`);
  lines.push(`Status: ${result.ok ? '✓ Healthy' : '✗ Issues Found'}`);
  lines.push('');

  if (result.issues.length === 0) {
    lines.push('✓ All checks passed');
    lines.push('✓ No issues detected');
    return lines.join('\n');
  }

  const errorCount = result.issues.filter(i => i.severity === 'error').length;
  const warningCount = result.issues.filter(i => i.severity === 'warning').length;
  const infoCount = result.issues.filter(i => i.severity === 'info').length;

  lines.push(`Issues: ${errorCount} error(s), ${warningCount} warning(s), ${infoCount} info`);
  lines.push('');

  const groupedIssues: Record<ValidationSeverity, ValidationIssue[]> = {
    error: [],
    warning: [],
    info: []
  };

  for (const issue of result.issues) {
    groupedIssues[issue.severity].push(issue);
  }

  for (const severity of ['error', 'warning', 'info'] as const) {
    const severityIssues = groupedIssues[severity];
    if (severityIssues.length === 0) continue;

    const symbol = severity === 'error' ? '✗' : severity === 'warning' ? '⚠' : 'ℹ';
    const label = severity.toUpperCase();

    lines.push(`${label}S:`);
    for (const issue of severityIssues) {
      lines.push(`  ${symbol} ${issue.message}`);
      if (issue.expectedPath) {
        lines.push(`    → Expected: ${issue.expectedPath}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
