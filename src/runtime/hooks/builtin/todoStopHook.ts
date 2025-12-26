import fs from 'node:fs';
import path from 'node:path';
import type { AgentStopContext, AgentStopResult } from '../types.js';

/**
 * Todo-based stop hook - The KEY to long-horizon autonomy.
 *
 * Simple logic:
 * - IF incomplete todos exist → BLOCK stop (agent has work to do)
 * - IF all todos completed → ALLOW stop (agent finished)
 * - IF no todos exist → ALLOW stop (agent didn't need task tracking)
 *
 * This matches the OpenHands Planner Agent pattern and enables 30+ hour autonomous runs.
 */
export function createTodoStopHook(params: {
  enabled: boolean;
  workspaceDir?: string;
}) {
  const onStop = async (ctx: AgentStopContext): Promise<AgentStopResult> => {
    if (!params.enabled || !params.workspaceDir) {
      return { action: "allow" };
    }

    try {
      const todoPath = path.join(
        params.workspaceDir,
        'todos',
        'sessions',
        `${ctx.sessionId}.json`
      );

      if (!fs.existsSync(todoPath)) {
        return { action: "allow" }; // No todos = no tracking needed
      }

      const content = fs.readFileSync(todoPath, 'utf8');
      const data = JSON.parse(content);
      const todos = Array.isArray(data.todos) ? data.todos : [];

      const pending = todos.filter((t: any) => t.status === 'pending');
      const inProgress = todos.filter((t: any) => t.status === 'in_progress');
      const completed = todos.filter((t: any) => t.status === 'completed');
      const incomplete = [...pending, ...inProgress];

      if (incomplete.length === 0) {
        return { action: "allow" }; // All done!
      }

      // Block stop - agent still has work
      return {
        action: "block",
        reason: "incomplete_todos",
        statusMessage: `${incomplete.length} todos incomplete (${pending.length} pending, ${inProgress.length} in progress)`,
        systemPrompt:
          `You have ${incomplete.length} incomplete todo(s):\n` +
          inProgress
            .slice(0, 3)
            .map((t: any) => `- [in_progress] ${t.content}`)
            .join('\n') +
          (inProgress.length > 0 && pending.length > 0 ? '\n' : '') +
          pending
            .slice(0, 5 - inProgress.length)
            .map((t: any) => `- [pending] ${t.content}`)
            .join('\n') +
          (incomplete.length > 5 ? `\n... and ${incomplete.length - 5} more` : '') +
          `\n\nComplete these tasks before stopping.`
      };
    } catch {
      return { action: "allow" }; // On error, allow stop
    }
  };

  return {
    type: "agent_stop" as const,
    name: "todo_stop",
    priority: 40, // Run before plan validation (50)
    enabled: params.enabled,
    run: onStop,
  };
}
