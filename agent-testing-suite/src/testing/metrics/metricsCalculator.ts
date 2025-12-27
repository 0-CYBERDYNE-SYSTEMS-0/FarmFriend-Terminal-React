import { LogEvent, Metrics, ToolMetrics } from "../types.js";
import { LogParser } from "./logParser.js";

/**
 * Calculate metrics from session logs
 */
export class MetricsCalculator {
  private workspaceDir: string;
  private parser: LogParser;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.parser = new LogParser(workspaceDir);
  }

  /**
   * Calculate full metrics for a session
   */
  async calculateMetrics(sessionId: string): Promise<Metrics> {
    const sessionEvents = await this.parser.parseSession(sessionId);
    const toolEvents = await this.parser.parseToolLog(sessionId);

    const turnStartEvents = this.parser.filterByEvent(sessionEvents, "turn_start");
    const turnCompleteEvents = this.parser.filterByEvent(sessionEvents, "turn_complete");
    const toolStartEvents = this.parser.filterByEvent(toolEvents, "tool_start");
    const toolEndEvents = this.parser.filterByEvent(toolEvents, "tool_end");
    const circuitBreakerEvents = this.parser.filterByEvent(sessionEvents, "circuit_breaker_tripped");

    const metrics: Metrics = {
      // Task-level
      success_rate: this.calculateSuccessRate(toolEndEvents),
      completion_rate: this.calculateCompletionRate(turnCompleteEvents),
      avg_duration_ms: this.calculateAvgTurnDuration(turnStartEvents, turnCompleteEvents),

      // Tool-level
      tool_usage: this.calculateToolUsage(toolStartEvents, toolEndEvents),

      // Turn-level
      avg_iterations: this.calculateAvgIterations(turnStartEvents.length, turnCompleteEvents.length),
      avg_tool_calls: this.calculateAvgToolCalls(turnCompleteEvents, toolEndEvents),

      // System-level
      circuit_breaker_trips: circuitBreakerEvents.length,
      plan_validation_events: this.parser.filterByEvent(sessionEvents, "plan_created").length,

      // Metadata
      total_turns: turnCompleteEvents.length,
      total_tool_calls: toolEndEvents.length,
      total_errors: this.countErrors(toolEndEvents)
    };

    return metrics;
  }

  private calculateSuccessRate(toolEndEvents: LogEvent[]): number {
    if (toolEndEvents.length === 0) return 1.0;
    const successful = toolEndEvents.filter((e) => e.ok === true).length;
    return successful / toolEndEvents.length;
  }

  private calculateCompletionRate(turnCompleteEvents: LogEvent[]): number {
    if (turnCompleteEvents.length === 0) return 0;
    const completed = turnCompleteEvents.filter((e) => !e.aborted).length;
    return completed / turnCompleteEvents.length;
  }

  private calculateAvgTurnDuration(
    turnStartEvents: LogEvent[],
    turnCompleteEvents: LogEvent[]
  ): number {
    if (turnCompleteEvents.length === 0) return 0;

    const turnDurations = turnCompleteEvents.map((endEvent) => {
      const startEvent = turnStartEvents.find((s) => s.turn_id === endEvent.turn_id);
      if (startEvent && endEvent.duration_ms) {
        return endEvent.duration_ms;
      }
      return 0;
    }).filter((d) => d > 0);

    if (turnDurations.length === 0) return 0;
    return turnDurations.reduce((a, b) => a + b, 0) / turnDurations.length;
  }

  private calculateToolUsage(
    toolStartEvents: LogEvent[],
    toolEndEvents: LogEvent[]
  ): Record<string, ToolMetrics> {
    const toolMetrics: Record<string, ToolMetrics> = {};

    // Initialize from start events
    for (const startEvent of toolStartEvents) {
      const toolName = startEvent.tool_name;
      if (!toolName) continue;

      if (!toolMetrics[toolName]) {
        toolMetrics[toolName] = {
          call_count: 0,
          success_count: 0,
          fail_count: 0,
          avg_duration_ms: 0,
          total_duration_ms: 0,
          error_types: {}
        };
      }
      toolMetrics[toolName].call_count++;
    }

    // Update with end events
    for (const endEvent of toolEndEvents) {
      const toolName = endEvent.tool_name;
      if (!toolName || !toolMetrics[toolName]) continue;

      const metrics = toolMetrics[toolName];
      if (endEvent.ok) {
        metrics.success_count++;
      } else {
        metrics.fail_count++;
        // Track error types
        const errorType = endEvent.reason || "unknown";
        metrics.error_types[errorType] = (metrics.error_types[errorType] || 0) + 1;
      }

      if (endEvent.duration_ms) {
        metrics.total_duration_ms += endEvent.duration_ms;
      }
    }

    // Calculate averages
    for (const toolName in toolMetrics) {
      const metrics = toolMetrics[toolName];
      if (metrics.call_count > 0) {
        metrics.avg_duration_ms = metrics.total_duration_ms / metrics.call_count;
      }
    }

    return toolMetrics;
  }

  private calculateAvgIterations(turnStarts: number, turnCompletes: number): number {
    if (turnCompletes === 0) return 0;
    return turnStarts / turnCompletes;
  }

  private calculateAvgToolCalls(
    turnCompleteEvents: LogEvent[],
    toolEndEvents: LogEvent[]
  ): number {
    if (turnCompleteEvents.length === 0) return 0;
    return toolEndEvents.length / turnCompleteEvents.length;
  }

  private countErrors(toolEndEvents: LogEvent[]): number {
    return toolEndEvents.filter((e) => e.ok === false).length;
  }

  /**
   * Aggregate metrics from multiple sessions
   */
  aggregateMetrics(sessionMetrics: Metrics[]): Metrics {
    if (sessionMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const aggregated: Metrics = {
      // Task-level
      success_rate: this.average(sessionMetrics.map((m) => m.success_rate)),
      completion_rate: this.average(sessionMetrics.map((m) => m.completion_rate)),
      avg_duration_ms: this.average(sessionMetrics.map((m) => m.avg_duration_ms)),

      // Tool-level (sum all tool usage)
      tool_usage: this.aggregateToolUsage(sessionMetrics.map((m) => m.tool_usage)),

      // Turn-level
      avg_iterations: this.average(sessionMetrics.map((m) => m.avg_iterations)),
      avg_tool_calls: this.average(sessionMetrics.map((m) => m.avg_tool_calls)),

      // System-level
      circuit_breaker_trips: this.sum(sessionMetrics.map((m) => m.circuit_breaker_trips)),
      plan_validation_events: this.sum(sessionMetrics.map((m) => m.plan_validation_events)),

      // Metadata
      total_turns: this.sum(sessionMetrics.map((m) => m.total_turns)),
      total_tool_calls: this.sum(sessionMetrics.map((m) => m.total_tool_calls)),
      total_errors: this.sum(sessionMetrics.map((m) => m.total_errors))
    };

    return aggregated;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  private aggregateToolUsage(
    toolUsageArrays: Record<string, ToolMetrics>[]
  ): Record<string, ToolMetrics> {
    const aggregated: Record<string, ToolMetrics> = {};

    for (const usage of toolUsageArrays) {
      for (const toolName in usage) {
        if (!aggregated[toolName]) {
          aggregated[toolName] = { ...usage[toolName] };
        } else {
          const current = aggregated[toolName];
          const next = usage[toolName];
          current.call_count += next.call_count;
          current.success_count += next.success_count;
          current.fail_count += next.fail_count;
          current.total_duration_ms += next.total_duration_ms;

          // Merge error types
          for (const errorType in next.error_types) {
            current.error_types[errorType] = (current.error_types[errorType] || 0) + next.error_types[errorType];
          }
        }
      }
    }

    // Recalculate averages
    for (const toolName in aggregated) {
      const metrics = aggregated[toolName];
      if (metrics.call_count > 0) {
        metrics.avg_duration_ms = metrics.total_duration_ms / metrics.call_count;
      }
    }

    return aggregated;
  }

  private getEmptyMetrics(): Metrics {
    return {
      success_rate: 0,
      completion_rate: 0,
      avg_duration_ms: 0,
      tool_usage: {},
      avg_iterations: 0,
      avg_tool_calls: 0,
      circuit_breaker_trips: 0,
      plan_validation_events: 0,
      total_turns: 0,
      total_tool_calls: 0,
      total_errors: 0
    };
  }
}
