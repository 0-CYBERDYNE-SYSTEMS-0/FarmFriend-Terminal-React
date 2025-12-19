export type PromiseType =
  | "tool_execution"
  | "file_operation"
  | "analysis"
  | "creation"
  | "modification"
  | "verification"
  | "research";

export type Promise = {
  id: string;
  content: string;
  promiseType: PromiseType;
  extractedAction: string;
  extractedTarget: string;
  confidence: number; // 0..1
  fulfilled: boolean;
  fulfillmentEvidence: string[];
};

export type ExecutionRecord = {
  id: string;
  toolName: string;
  parameters: unknown;
  success: boolean;
  resultSummary?: string;
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function cleanText(text: string): string {
  return text
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s'".,!?/:\[\](){}-]/g, " ")
    .trim();
}

function isVagueTarget(t: string): boolean {
  const s = t.trim().toLowerCase();
  if (!s) return true;
  if (["it", "this", "that", "things", "stuff", "everything", "the task", "the issue"].includes(s)) return true;
  if (s.length < 3) return true;
  return false;
}

function refinePromiseType(action: string, fallback: PromiseType): PromiseType {
  const a = action.trim().toLowerCase();
  if (["read", "write", "edit", "create", "modify", "update", "delete", "save"].includes(a)) return "file_operation";
  if (["search", "find", "investigate", "research", "browse", "look"].includes(a)) return "research";
  if (["analyze", "examine", "check", "inspect"].includes(a)) return "analysis";
  if (["verify", "validate", "test"].includes(a)) return "verification";
  if (["generate", "build", "construct", "make", "produce", "develop"].includes(a)) return "creation";
  return fallback;
}

function calcConfidence(raw: string, action: string, target: string): number {
  let c = 0.4;
  const r = raw.toLowerCase();
  if (r.includes("i will") || r.includes("i'll") || r.includes("let me") || r.includes("next")) c += 0.2;
  if (action.trim().length >= 3) c += 0.2;
  if (!isVagueTarget(target)) c += 0.2;
  if (target.trim().includes("/") || target.trim().includes(".") || target.trim().match(/[A-Za-z0-9_-]+\.[A-Za-z0-9]+/)) c += 0.1;
  return Math.max(0, Math.min(1, c));
}

const PATTERNS: Array<{ re: RegExp; type: PromiseType }> = [
  { re: /\bI\s*(?:'|’)?ll\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bI\s+will\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bLet\s+me\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bNext,?\s+I\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bFirst,?\s+I\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\bI\s+need\s+to\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },

  // Continuation patterns (catch "then open", "and then verify", etc.)
  { re: /\b(?:then|and\s+then)\s+(\w+)\s+([^.!?]+)\b/gi, type: "tool_execution" },
  { re: /\band\s+(\w+)\s+(it|the\s+\w+|[^.!?]+)\b/gi, type: "tool_execution" },

  { re: /\bI\s*(?:'|')?ll\s+(read|write|edit|create|modify|update|delete|save)\s+([^.!?]+)\b/gi, type: "file_operation" },
  { re: /\bI\s+will\s+(read|write|edit|create|modify|update|delete|save)\s+([^.!?]+)\b/gi, type: "file_operation" },
  { re: /\bI\s+will\s+(verify|validate|test|check)\s+([^.!?]+)\b/gi, type: "verification" },
  { re: /\bLet\s+me\s+(search|find|investigate|research|browse)\s+([^.!?]+)\b/gi, type: "research" }
];

export function extractPromises(textRaw: string): Promise[] {
  const text = cleanText(textRaw);
  if (!text) return [];
  const out: Promise[] = [];

  for (const { re, type } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const action = String(m[1] || "").trim();
      const target = String(m[2] || "").trim();
      if (!action) continue;
      const promiseType = refinePromiseType(action, type);
      const confidence = calcConfidence(String(m[0] || ""), action, target);
      out.push({
        id: newId("promise"),
        content: String(m[0] || "").trim(),
        promiseType,
        extractedAction: action,
        extractedTarget: target,
        confidence,
        fulfilled: false,
        fulfillmentEvidence: []
      });
    }
  }

  // Deduplicate by normalized action+target+type; keep the highest-confidence instance.
  const byKey = new Map<string, Promise>();
  for (const p of out) {
    const key = `${p.promiseType}::${p.extractedAction.toLowerCase()}::${p.extractedTarget.toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev || p.confidence > prev.confidence) byKey.set(key, p);
  }
  return [...byKey.values()];
}

function actionMatchesTool(actionRaw: string, toolNameRaw: string, promiseType: PromiseType): boolean {
  const action = actionRaw.trim().toLowerCase();
  const toolName = toolNameRaw.trim().toLowerCase();

  if (toolName.includes(action)) return true;

  if (promiseType === "file_operation") {
    return ["read_file", "write_file", "edit_file", "multi_edit_file", "glob", "grep", "search_code", "semantic_search"].includes(toolName);
  }
  if (promiseType === "research") {
    return ["tavily_search", "tavily_extract", "tavily_map", "tavily_crawl", "perplexity_search", "browse_web"].includes(toolName);
  }
  if (promiseType === "verification") {
    return toolName === "run_command";
  }
  return false;
}

function matchScore(p: Promise, e: ExecutionRecord): number {
  let score = 0;
  if (actionMatchesTool(p.extractedAction, e.toolName, p.promiseType)) score += 0.45;
  const target = p.extractedTarget.trim().toLowerCase();
  if (target && !isVagueTarget(target)) {
    try {
      const s = JSON.stringify(e.parameters ?? {}).toLowerCase();
      if (s.includes(target)) score += 0.35;
    } catch {
      // ignore
    }
  }
  if (e.success) score += 0.2;
  return Math.min(1, score);
}

export function markFulfilled(promises: Promise[], executions: ExecutionRecord[]): Promise[] {
  for (const p of promises) {
    if (p.fulfilled) continue;
    const best = executions
      .map((e) => ({ e, s: matchScore(p, e) }))
      .sort((a, b) => b.s - a.s)[0];
    if (best && best.s >= 0.7) {
      p.fulfilled = true;
      p.fulfillmentEvidence.push(`${best.e.toolName}(${best.s.toFixed(2)})`);
    }
  }
  return promises;
}

export function unfulfilledHighConfidence(promises: Promise[], minConfidence = 0.65): Promise[] {
  return promises.filter((p) => !p.fulfilled && p.confidence >= minConfidence && !isVagueTarget(p.extractedTarget));
}

export function buildContinuationFeedback(unfulfilled: Promise[]): string {
  const lines = unfulfilled.slice(0, 6).map((p) => `- ${p.promiseType}: "${p.content}" (target: ${p.extractedTarget})`);
  return (
    `Completion validator: you made commitments that still appear unfulfilled.\n` +
    `Before finishing, complete them (or explicitly explain why they cannot be completed in this environment).\n` +
    lines.join("\n")
  );
}
