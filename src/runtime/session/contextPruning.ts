import type { OpenAIMessage } from "../providers/types.js";
import type { RuntimeConfig } from "../config/loadConfig.js";

type PruningConfig = NonNullable<NonNullable<RuntimeConfig["session"]>["contextPruning"]>;

type NormalizedPruningConfig = {
  enabled: boolean;
  mode: "adaptive" | "aggressive";
  keepLastAssistants: number;
  softTrimRatio: number;
  hardClearRatio: number;
  minPrunableToolChars: number;
  softTrim: { maxChars: number; headChars: number; tailChars: number };
  hardClear: { enabled: boolean; placeholder: string };
  tools: { allow: string[]; deny: string[] };
};

type PruningStats = {
  enabled: boolean;
  mode: "adaptive" | "aggressive";
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  trimmedCount: number;
  clearedCount: number;
  prunedChars: number;
};

const DEFAULTS = {
  enabled: false,
  mode: "adaptive" as const,
  keepLastAssistants: 3,
  softTrimRatio: 0.3,
  hardClearRatio: 0.5,
  minPrunableToolChars: 50000,
  softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
  hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
  tools: { allow: [] as string[], deny: [] as string[] }
};

function normalizeConfig(cfg?: PruningConfig): NormalizedPruningConfig {
  return {
    enabled: cfg?.enabled ?? DEFAULTS.enabled,
    mode: (cfg?.mode ?? DEFAULTS.mode) as "adaptive" | "aggressive",
    keepLastAssistants: Math.max(1, cfg?.keepLastAssistants ?? DEFAULTS.keepLastAssistants),
    softTrimRatio: cfg?.softTrimRatio ?? DEFAULTS.softTrimRatio,
    hardClearRatio: cfg?.hardClearRatio ?? DEFAULTS.hardClearRatio,
    minPrunableToolChars: cfg?.minPrunableToolChars ?? DEFAULTS.minPrunableToolChars,
    softTrim: {
      maxChars: cfg?.softTrim?.maxChars ?? DEFAULTS.softTrim.maxChars,
      headChars: cfg?.softTrim?.headChars ?? DEFAULTS.softTrim.headChars,
      tailChars: cfg?.softTrim?.tailChars ?? DEFAULTS.softTrim.tailChars
    },
    hardClear: {
      enabled: cfg?.hardClear?.enabled ?? DEFAULTS.hardClear.enabled,
      placeholder: cfg?.hardClear?.placeholder ?? DEFAULTS.hardClear.placeholder
    },
    tools: {
      allow: cfg?.tools?.allow ?? DEFAULTS.tools.allow,
      deny: cfg?.tools?.deny ?? DEFAULTS.tools.deny
    }
  };
}

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateTokens(messages: OpenAIMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      total += estimateTokensFromText(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") total += estimateTokensFromText(block.text || "");
      }
    } else if ((msg as any).content && typeof (msg as any).content === "object") {
      total += estimateTokensFromText(JSON.stringify((msg as any).content));
    }
  }
  return total;
}

function matchesToolFilter(name: string | undefined, allow: string[], deny: string[]): boolean {
  const toolName = String(name || "").trim();
  if (!toolName) return false;
  const match = (pattern: string) => {
    if (pattern === "*") return true;
    if (pattern.endsWith("*")) return toolName.startsWith(pattern.slice(0, -1));
    return toolName === pattern;
  };
  if (deny.some(match)) return false;
  if (!allow.length) return true;
  return allow.some(match);
}

function findAssistantCutoff(messages: OpenAIMessage[], keepLastAssistants: number): number {
  let assistantsSeen = 0;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") {
      assistantsSeen += 1;
      if (assistantsSeen >= keepLastAssistants) {
        return i;
      }
    }
  }
  return -1;
}

export function pruneToolMessages(params: {
  messages: OpenAIMessage[];
  cfg: RuntimeConfig;
  contextWindowTokens?: number;
}): { messages: OpenAIMessage[]; stats: PruningStats } {
  const pruning = normalizeConfig((params.cfg as any)?.session?.contextPruning);
  const estimatedBefore = estimateTokens(params.messages);
  const stats: PruningStats = {
    enabled: pruning.enabled,
    mode: pruning.mode,
    estimatedTokensBefore: estimatedBefore,
    estimatedTokensAfter: estimatedBefore,
    trimmedCount: 0,
    clearedCount: 0,
    prunedChars: 0
  };
  if (!pruning.enabled) return { messages: params.messages, stats };

  const contextWindow = Number(params.contextWindowTokens ?? (params.cfg as any).context_window ?? 200000);
  if (!Number.isFinite(contextWindow) || contextWindow <= 0) return { messages: params.messages, stats };

  const ratio = estimatedBefore / contextWindow;
  const cutoffIdx = findAssistantCutoff(params.messages, pruning.keepLastAssistants);
  if (cutoffIdx === -1) return { messages: params.messages, stats };

  const canPrune = (msg: OpenAIMessage, idx: number) =>
    msg.role === "tool" &&
    idx < cutoffIdx &&
    typeof msg.content === "string" &&
    matchesToolFilter((msg as any).name, pruning.tools.allow, pruning.tools.deny);

  const next = params.messages.map((m) => ({ ...m })) as OpenAIMessage[];
  const prunableIndexes: number[] = [];
  let prunableChars = 0;

  for (let i = 0; i < next.length; i += 1) {
    if (!canPrune(next[i], i)) continue;
    prunableIndexes.push(i);
    prunableChars += (next[i].content as string).length;
  }

  if (!prunableIndexes.length) return { messages: params.messages, stats };

  const softTrim = (idx: number) => {
    const msg = next[idx];
    const content = msg.content as string;
    if (content.length <= pruning.softTrim.maxChars) return false;
    const head = content.slice(0, pruning.softTrim.headChars);
    const tail = content.slice(Math.max(0, content.length - pruning.softTrim.tailChars));
    const trimmed = `${head}\n...\n${tail}\n[trimmed from ${content.length} chars]`;
    stats.prunedChars += content.length - trimmed.length;
    stats.trimmedCount += 1;
    msg.content = trimmed;
    return true;
  };

  const hardClear = (idx: number) => {
    const msg = next[idx];
    const content = msg.content as string;
    const placeholder = pruning.hardClear.placeholder || DEFAULTS.hardClear.placeholder;
    if (content === placeholder) return false;
    stats.prunedChars += content.length - placeholder.length;
    stats.clearedCount += 1;
    msg.content = placeholder;
    return true;
  };

  if (pruning.mode === "aggressive") {
    for (const idx of prunableIndexes) hardClear(idx);
    stats.estimatedTokensAfter = estimateTokens(next);
    return { messages: next, stats };
  }

  if (ratio >= pruning.softTrimRatio) {
    for (const idx of prunableIndexes) softTrim(idx);
  }

  stats.estimatedTokensAfter = estimateTokens(next);
  const ratioAfterSoft = stats.estimatedTokensAfter / contextWindow;

  if (ratioAfterSoft >= pruning.hardClearRatio && prunableChars >= pruning.minPrunableToolChars) {
    const hardClearEnabled = pruning.hardClear.enabled;
    if (hardClearEnabled) {
      for (const idx of prunableIndexes) hardClear(idx);
      stats.estimatedTokensAfter = estimateTokens(next);
    }
  }

  return { messages: next, stats };
}
