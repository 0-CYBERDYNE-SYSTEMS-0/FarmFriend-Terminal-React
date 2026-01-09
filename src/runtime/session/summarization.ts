import { createProvider } from "../providers/factory.js";
import type { OpenAIMessage } from "../providers/types.js";
import type { RuntimeConfig } from "../config/loadConfig.js";
import type { SessionFile } from "./sessionStore.js";

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateConversationTokens(messages: SessionFile["conversation"]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content || ""), 0);
}

function formatTranscript(messages: SessionFile["conversation"]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "Assistant" : m.role === "user" ? "User" : "System";
      return `${role}: ${m.content}`;
    })
    .join("\n");
}

export async function summarizeSessionHistory(params: {
  session: SessionFile;
  cfg: RuntimeConfig;
  repoRoot: string;
  keepLast?: number;
  maxSummaryTokens?: number;
  sessionId?: string;
}): Promise<{ session: SessionFile; summary: string; summarizedCount: number }> {
  const keepLast = Math.max(5, Number(params.keepLast ?? 40));
  const conversation = params.session.conversation;
  if (conversation.length <= keepLast) {
    return { session: params.session, summary: "", summarizedCount: 0 };
  }

  const toSummarize = conversation.slice(0, Math.max(0, conversation.length - keepLast));
  const recent = conversation.slice(conversation.length - keepLast);
  if (!toSummarize.length) {
    return { session: params.session, summary: "", summarizedCount: 0 };
  }

  const prompt = [
    "Summarize the following conversation segment for long-term memory.",
    "Focus on: user preferences, key facts, decisions, ongoing tasks, and open questions.",
    "Be concise and structured. Use bullet points.",
    "",
    formatTranscript(toSummarize)
  ].join("\n");

  const { provider, model } = createProvider({ repoRoot: params.repoRoot });
  const maxTokens = Math.min(Number((params.cfg as any).max_tokens ?? 12000), Number(params.maxSummaryTokens ?? 1200));

  const messages: OpenAIMessage[] = [
    {
      role: "system",
      content: "You are a careful summarizer. Preserve factual details and action items. Do not invent information."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  const controller = new AbortController();
  let summary = "";

  for await (const ev of provider.streamChat({
    model,
    messages,
    tools: [],
    temperature: 0.2,
    maxTokens,
    signal: controller.signal,
    tool_choice: "none",
    glmThinkingMode: (params.cfg as any).glm_thinking_mode
  })) {
    if (ev.type === "content") summary += ev.delta;
    if (ev.type === "final") {
      summary = ev.content || summary;
      break;
    }
    if (ev.type === "error") {
      throw new Error(ev.message || "Summarization failed");
    }
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    return { session: params.session, summary: "", summarizedCount: 0 };
  }

  const summaryMessage = {
    role: "assistant" as const,
    content: `Summary of earlier conversation:\n${trimmed}`,
    created_at: new Date().toISOString()
  };

  const nextSession: SessionFile = {
    ...params.session,
    conversation: [summaryMessage, ...recent],
    meta: {
      ...(params.session.meta || {}),
      last_summary_at: new Date().toISOString(),
      last_summary_count: toSummarize.length
    }
  };

  return { session: nextSession, summary: trimmed, summarizedCount: toSummarize.length };
}
