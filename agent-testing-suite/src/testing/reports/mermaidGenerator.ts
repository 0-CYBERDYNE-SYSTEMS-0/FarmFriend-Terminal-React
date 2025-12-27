import { LogParser } from "../metrics/logParser.js";
import { TestRun } from "../types.js";

/**
 * Generate Mermaid diagrams for test reports
 */
export class MermaidGenerator {
  private workspaceDir: string;
  private logParser: LogParser;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.logParser = new LogParser(workspaceDir);
  }

  /**
   * Generate flowchart for scenario execution
   */
  async generateFlowchart(run: TestRun): Promise<string> {
    let mermaid = "graph TD\n";
    mermaid += "    Start([🚀 Start])\n";
    mermaid += "    End([✅ End])\n\n";

    let nodeId = 1;

    for (const result of run.results) {
      const scenarioId = nodeId++;
      mermaid += `    Scenario${scenarioId}[🧪 ${result.scenario_name}] -->\n`;

      // Add turn nodes
      const turnId = nodeId++;
      mermaid += `    Turn${turnId}[📝 ${result.turn_count} turn(s)]\n`;
      mermaid += `    Scenario${scenarioId} --> Turn${turnId}\n`;

      // Add tool calls node
      const toolId = nodeId++;
      mermaid += `    Tools${toolId}[🔧 ${result.tool_calls} tool(s)]\n`;
      mermaid += `    Turn${turnId} --> Tools${toolId}\n`;

      // Add duration
      const duration = (result.duration_ms / 1000).toFixed(1);
      const durId = nodeId++;
      mermaid += `    Duration${durId}[⏱️ ${duration}s]\n`;
      mermaid += `    Tools${toolId} --> Duration${durId}\n`;

      // Add status
      const statusId = nodeId++;
      const emoji = result.status === "passed" ? "✅" : result.status === "failed" ? "❌" : "⚠️";
      const color = result.status === "passed" ? "#10b981" : result.status === "failed" ? "#ef4444" : "#f59e0b";
      mermaid += `    Status${statusId}("${emoji} ${result.status}")\n`;
      mermaid += `    Duration${durId} --> Status${statusId}\n`;

      // Connect to end
      mermaid += `    Status${statusId} --> End\n\n`;

      // Style based on status
      if (result.status === "failed") {
        mermaid += `    Style Status${statusId} fill:#fee2e2,stroke:#ef4444\n`;
      } else if (result.status === "partial") {
        mermaid += `    Style Status${statusId} fill:#fef3c7,stroke:#f59e0b\n`;
      } else {
        mermaid += `    Style Status${statusId} fill:#dcfce7,stroke:#10b981\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate sequence diagram for tool interactions
   */
  async generateSequenceDiagram(run: TestRun): Promise<string> {
    let mermaid = "sequenceDiagram\n";
    mermaid += "    participant User as 👤 User\n";
    mermaid += "    participant Agent as 🤖 Agent\n";
    mermaid += "    participant Tools as 🔧 Tools\n\n";

    for (const result of run.results) {
      mermaid += `    Note over User,Tools: 🧪 ${result.scenario_name}\n`;

      for (let i = 0; i < result.turn_count; i++) {
        mermaid += `    User->>Agent: Prompt ${i + 1}\n`;
        mermaid += `    Agent->>Tools: Execute tools\n`;
        mermaid += `    Tools-->>Agent: Results\n`;
        mermaid += `    Agent-->>User: Response\n`;
      }

      mermaid += "\n";
    }

    return mermaid;
  }

  /**
   * Generate tool dependency graph
   */
  async generateToolDependencyGraph(run: TestRun): Promise<string> {
    if (!run.metrics || Object.keys(run.metrics.tool_usage).length === 0) {
      return "graph LR\n    NoTools[No tool usage data]\n";
    }

    let mermaid = "graph LR\n";

    // Group tools by category
    const fileTools = ["read_file", "write_file", "edit_file", "multi_edit_file", "glob", "grep"];
    const webTools = ["tavily_search", "perplexity_search", "browse_web", "tavily_extract"];
    const systemTools = ["run_command", "macos_control"];
    const analysisTools = ["analyze_data", "analyze_image_gemini", "analyze_video_gemini"];

    const categorized: Record<string, string[]> = {
      "File Operations": [],
      "Web & Search": [],
      "System": [],
      "Analysis": [],
      "Other": []
    };

    for (const toolName of Object.keys(run.metrics.tool_usage)) {
      const usage = run.metrics.tool_usage[toolName];
      const callCount = usage.call_count;

      if (fileTools.includes(toolName)) {
        categorized["File Operations"].push(`${toolName}(${callCount})`);
      } else if (webTools.includes(toolName)) {
        categorized["Web & Search"].push(`${toolName}(${callCount})`);
      } else if (systemTools.includes(toolName)) {
        categorized["System"].push(`${toolName}(${callCount})`);
      } else if (analysisTools.includes(toolName)) {
        categorized["Analysis"].push(`${toolName}(${callCount})`);
      } else {
        categorized["Other"].push(`${toolName}(${callCount})`);
      }
    }

    let subgraphCount = 0;

    for (const [category, tools] of Object.entries(categorized)) {
      if (tools.length === 0) continue;

      mermaid += `    subgraph ${category} [${category}]\n`;
      subgraphCount++;

      const lastIdx = tools.length - 1;
      tools.forEach((tool, idx) => {
        mermaid += `        ${tool}`;
        if (idx < lastIdx) {
          mermaid += " --> ";
        } else {
          mermaid += "\n";
        }
      });

      mermaid += "    end\n\n";

      // Style subgraph based on category
      const colors: Record<string, string> = {
        "File Operations": "#dbeafe",
        "Web & Search": "#fce7f3",
        "System": "#f3e8ff",
        "Analysis": "#dcfce7",
        "Other": "#f3f4f6"
      };
      mermaid += `    style ${category} fill:${colors[category] || "#f3f4f6"},stroke:#9ca3af\n\n`;
    }

    return mermaid;
  }

  /**
   * Generate state diagram for session flow
   */
  async generateStateDiagram(run: TestRun): Promise<string> {
    let mermaid = "stateDiagram-v2\n";
    mermaid += "    [*] --> Initializing\n";
    mermaid += "    Initializing --> Processing\n";
    mermaid += "    Processing --> Evaluating\n";
    mermaid += "    Evaluating --> Processing: More work needed\n";
    mermaid += "    Evaluating --> Completed: Task done\n";
    mermaid += "    Evaluating --> Failed: Error occurred\n";
    mermaid += "    Completed --> [*]\n";
    mermaid += "    Failed --> [*]\n\n";

    // Add scenario-specific states
    for (let i = 0; i < run.results.length; i++) {
      const result = run.results[i];
      mermaid += `    state "${result.scenario_name}" {\n`;
      mermaid += `        [*] --> TurnStart\n`;
      mermaid += `        TurnStart --> ToolExecution: Execute tools\n`;
      mermaid += `        ToolExecution --> TurnEnd: Tools complete\n`;
      mermaid += `        TurnEnd --> [*]: Next turn or end\n`;
      mermaid += `    }\n\n`;
    }

    return mermaid;
  }

  /**
   * Generate timeline chart
   */
  async generateTimeline(run: TestRun): Promise<string> {
    let mermaid = "gantt\n";
    mermaid += "    title Agent Execution Timeline\n";
    mermaid += "    dateFormat X\n";
    mermaid += "    axisFormat %Ls\n\n";

    let cumulativeTime = 0;

    for (const result of run.results) {
      const duration = result.duration_ms / 1000;
      const scenarioName = result.scenario_name.substring(0, 20); // Limit length

      mermaid += `    ${scenarioName} :a${cumulativeTime}, ${duration}\n`;
      cumulativeTime += duration;
    }

    return mermaid;
  }

  /**
   * Generate knowledge graph of tool relationships
   */
  async generateKnowledgeGraph(run: TestRun): Promise<string> {
    if (!run.metrics) {
      return "graph TD\n    NoData[No metrics available]\n";
    }

    let mermaid = "graph TD\n";
    mermaid += "    Agent[🤖 Agent]\n";

    const tools = Object.entries(run.metrics.tool_usage);
    const topTools = tools
      .sort((a, b) => b[1].call_count - a[1].call_count)
      .slice(0, 10); // Top 10 tools

    for (const [toolName, usage] of topTools) {
      const nodeId = toolName.replace(/_/g, "");
      const successRate = usage.call_count > 0
        ? (usage.success_count / usage.call_count * 100).toFixed(0)
        : 0;

      mermaid += `    ${nodeId}["${toolName}\\n${usage.call_count} calls\\n${successRate}% success"]\n`;
      mermaid += `    Agent -->|${usage.call_count}| ${nodeId}\n`;

      // Color based on success rate
      if (successRate >= 90) {
        mermaid += `    Style ${nodeId} fill:#dcfce7,stroke:#10b981\n`;
      } else if (successRate >= 70) {
        mermaid += `    Style ${nodeId} fill:#fef3c7,stroke:#f59e0b\n`;
      } else {
        mermaid += `    Style ${nodeId} fill:#fee2e2,stroke:#ef4444\n`;
      }
    }

    return mermaid;
  }

  /**
   * Generate heatmap for tool usage patterns
   */
  async generateToolHeatmap(run: TestRun): Promise<string> {
    if (!run.metrics) {
      return "No tool usage data available";
    }

    const tools = Object.entries(run.metrics.tool_usage);
    const maxCalls = Math.max(...tools.map(([, u]) => u.call_count));

    // Generate simple table representation
    let table = "| Tool | Calls | Success | Fail | Rate | Heatmap |\n";
    table += "|------|-------|---------|------|------|--------|\n";

    for (const [name, usage] of tools.sort((a, b) => b[1].call_count - a[1].call_count)) {
      const successRate = usage.call_count > 0
        ? (usage.success_count / usage.call_count * 100).toFixed(1)
        : "0.0";

      // Generate heatmap bar
      const barLength = Math.round((usage.call_count / maxCalls) * 20);
      const bar = "█".repeat(barLength);

      table += `| ${name} | ${usage.call_count} | ${usage.success_count} | ${usage.fail_count} | ${successRate}% | ${bar} |\n`;
    }

    return table;
  }
}
