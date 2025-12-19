import fs from "node:fs";
import path from "node:path";
import { ensureDir } from "../config/loadConfig.js";
import type { ValidationIssue } from "./doctor.js";

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

export type MigrationOperation = {
  type: 'move' | 'create' | 'copy';
  from?: string;
  to: string;
  backup?: string;
};

export type MigrationPlan = {
  operations: MigrationOperation[];
  summary: string;
};

export type MigrationResult = {
  success: boolean;
  completed: MigrationOperation[];
  failed: Array<{ operation: MigrationOperation; error: string }>;
  summary: string;
};

export function planMigration(workspaceDir: string, issues: ValidationIssue[]): MigrationPlan {
  const operations: MigrationOperation[] = [];

  for (const issue of issues) {
    if (issue.type === 'missing_directory') {
      operations.push({
        type: 'create',
        to: issue.path
      });
    }

    if (issue.type === 'legacy_data' || issue.type === 'misplaced_file') {
      if (issue.expectedPath) {
        operations.push({
          type: 'move',
          from: issue.path,
          to: issue.expectedPath
        });
      }
    }
  }

  const createCount = operations.filter(op => op.type === 'create').length;
  const moveCount = operations.filter(op => op.type === 'move').length;

  const summary = `${operations.length} operation(s): ${createCount} create, ${moveCount} move`;

  return {
    operations,
    summary
  };
}

export function ensureCanonicalStructure(workspaceDir: string): void {
  for (const dir of CANONICAL_DIRECTORIES) {
    const fullPath = path.join(workspaceDir, dir);
    ensureDir(fullPath);
  }
}

export function createBackup(sourcePath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${sourcePath}.backup-${timestamp}`;

  if (fs.existsSync(sourcePath)) {
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      fs.cpSync(sourcePath, backupPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, backupPath);
    }
  }

  return backupPath;
}

function moveFileOrDirectory(from: string, to: string, shouldCreateBackup: boolean): string | undefined {
  let backup: string | undefined;

  if (!fs.existsSync(from)) {
    throw new Error(`Source does not exist: ${from}`);
  }

  ensureDir(path.dirname(to));

  if (shouldCreateBackup && fs.existsSync(to)) {
    backup = createBackup(to);
  }

  const stats = fs.statSync(from);

  if (stats.isDirectory()) {
    if (fs.existsSync(to)) {
      const files = fs.readdirSync(from);
      for (const file of files) {
        const fromFile = path.join(from, file);
        const toFile = path.join(to, file);
        moveFileOrDirectory(fromFile, toFile, false);
      }
    } else {
      fs.renameSync(from, to);
    }
  } else {
    fs.renameSync(from, to);
  }

  return backup;
}

export async function executeMigration(
  plan: MigrationPlan,
  options: { dryRun?: boolean; backup?: boolean } = {}
): Promise<MigrationResult> {
  const { dryRun = false, backup: shouldBackup = true } = options;
  const completed: MigrationOperation[] = [];
  const failed: Array<{ operation: MigrationOperation; error: string }> = [];

  if (dryRun) {
    return {
      success: true,
      completed: [],
      failed: [],
      summary: `Dry run: ${plan.operations.length} operation(s) would be executed`
    };
  }

  for (const operation of plan.operations) {
    try {
      if (operation.type === 'create') {
        ensureDir(operation.to);
        completed.push(operation);
      } else if (operation.type === 'move' && operation.from) {
        const backup = moveFileOrDirectory(operation.from, operation.to, shouldBackup);
        completed.push({ ...operation, backup });
      } else if (operation.type === 'copy' && operation.from) {
        ensureDir(path.dirname(operation.to));

        const stats = fs.statSync(operation.from);
        if (stats.isDirectory()) {
          fs.cpSync(operation.from, operation.to, { recursive: true });
        } else {
          fs.copyFileSync(operation.from, operation.to);
        }
        completed.push(operation);
      }
    } catch (error) {
      failed.push({
        operation,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const success = failed.length === 0;
  const summary = success
    ? `Successfully completed ${completed.length} operation(s)`
    : `Completed ${completed.length}/${plan.operations.length} operation(s), ${failed.length} failed`;

  return {
    success,
    completed,
    failed,
    summary
  };
}

export function rollbackMigration(completed: MigrationOperation[]): void {
  for (const operation of completed.reverse()) {
    try {
      if (operation.type === 'create') {
        if (fs.existsSync(operation.to)) {
          const stats = fs.statSync(operation.to);
          if (stats.isDirectory()) {
            const files = fs.readdirSync(operation.to);
            if (files.length === 0) {
              fs.rmdirSync(operation.to);
            }
          }
        }
      } else if (operation.type === 'move' && operation.from && operation.backup) {
        if (fs.existsSync(operation.backup)) {
          fs.renameSync(operation.backup, operation.from);
        }
      }
    } catch {
      // Ignore rollback errors
    }
  }
}
