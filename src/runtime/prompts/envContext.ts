import os from "node:os";

export function buildEnvironmentalContext(params: { workingDir: string; sessionSummary?: string }): string {
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

  return [
    "## Environmental Context",
    timeLine,
    tzLine,
    `OS: ${osInfo}`,
    `Working Directory: ${params.workingDir}`,
    "",
    ...(params.sessionSummary
      ? [
          "## Session Summary (auto-loaded)",
          "This is the current `ff-terminal-workspace/session_summary.md` content for cross-session continuity:",
          "",
          params.sessionSummary.trim(),
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
