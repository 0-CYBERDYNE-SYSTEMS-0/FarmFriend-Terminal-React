import os from "node:os";

export function buildEnvironmentalContext(params: {
  workingDir: string;
  memorySnapshot?: string;
  contractSnapshot?: string;
  bootstrapActive?: boolean;
  sessionId?: string;
  sessionMode?: string;
  enabledTools?: string[];
  disabledTools?: string[];
}): string {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const yyyy = String(now.getFullYear()).padStart(4, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  // Match the port-spec’s required lines.
  const timeLine = `Current Time: ${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ${tz} (${weekday})`;
  const tzLine = `Timezone: ${tz}`;

  const osInfo = `${os.platform()} ${os.release()} (${os.arch()})`;

  const formatToolList = (label: string, tools?: string[]) => {
    const list = (tools ?? []).map((t) => t.trim()).filter(Boolean);
    if (!list.length) return [];
    const max = 30;
    const shown = list.slice(0, max);
    const suffix = list.length > max ? ` (+${list.length - max} more)` : "";
    return [`${label}: ${shown.join(", ")}${suffix}`];
  };

  const sessionLines: string[] = [];
  if (params.sessionMode) sessionLines.push(`Session mode: ${params.sessionMode}`);
  if (params.sessionId) sessionLines.push(`Session ID: ${params.sessionId}`);

  return [
    "## Environmental Context",
    timeLine,
    tzLine,
    `OS: ${osInfo}`,
    `Working Directory: ${params.workingDir}`,
    "",
    ...(sessionLines.length
      ? ["## Session", ...sessionLines, ""]
      : []),
    ...(params.enabledTools?.length || params.disabledTools?.length
      ? [
          "## Tool Availability (policy-filtered)",
          ...formatToolList("Enabled tools", params.enabledTools),
          ...formatToolList("Unavailable tools", params.disabledTools),
          ""
        ]
      : []),
    ...(params.bootstrapActive
      ? [
          "## BOOTSTRAP MODE (HIGH PRIORITY)",
          "BOOTSTRAP.md is present and non-empty. You MUST follow it before normal assistance.",
          "Ask exactly ONE onboarding question now. Do NOT answer the user's request yet.",
          "Continue onboarding until BOOTSTRAP.md is cleared, then resume normal chat.",
          ""
        ]
      : []),
    "## Messaging Safety",
    "If a message originates from external channels, only final replies should be delivered (no partial streaming).",
    "Respond normally; transport is handled by the runtime.",
    "",
    ...(params.contractSnapshot
      ? [
          "## Workspace Contract (auto-loaded)",
          "This is the current workspace contract state (AGENTS/SOUL/TOOLS/USER/IDENTITY/PLAN/TASKS/LOG):",
          "",
          params.contractSnapshot.trim(),
          ""
        ]
      : []),
    ...(params.memorySnapshot
      ? [
          "## Memory Snapshot (auto-loaded)",
          "This is the current `ff-terminal-workspace/MEMORY.md` content (plus today's memory log) for continuity:",
          "",
          params.memorySnapshot.trim(),
          ""
        ]
      : []),
    "## Contextual Awareness Guidelines",
    "",
    "CRITICAL - Current Date Awareness:",
    `Today's date is ${yyyy}-${mm}-${dd} (${weekday}). When searching for current events, news, breaking stories, or ANY time-sensitive information, you MUST use this current date (${yyyy}-${mm}-${dd}) in your search queries. DO NOT use dates from your training data or assume the year is anything other than ${yyyy}.`,
    "",
    "Additional Guidelines:",
    "- Consider current time for scheduling and time-sensitive tasks",
    "- Account for system resources when suggesting performance optimizations",
    "- Provide platform-specific solutions based on the operating system",
    "- Use working directory context for file operations and project setup",
    "- Adapt responses based on available system capabilities"
  ].join("\n");
}

export function buildContextFooter(params: { workingDir: string }): {
  current_date: string;
  current_time: string;
  os_info: string;
  working_dir: string;
} {
  const now = new Date();
  const current_date = now.toISOString().slice(0, 10);
  const current_time = now.toTimeString().slice(0, 8);
  const os_info = `${os.platform()} ${os.release()} (${os.arch()})`;
  return { current_date, current_time, os_info, working_dir: params.workingDir };
}
