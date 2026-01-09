import type { RuntimeConfig } from "../config/loadConfig.js";

export type SendPolicyDecision = {
  allowed: boolean;
  rule?: { action: "allow" | "deny"; match?: { provider?: string; chatType?: string; keyPrefix?: string } };
};

export function evaluateSendPolicy(params: {
  cfg: RuntimeConfig;
  provider: string;
  chatType: "group" | "direct" | "unknown";
  sessionId?: string;
}): SendPolicyDecision {
  const policy = (params.cfg as any)?.session?.sendPolicy;
  if (!policy) return { allowed: true };
  const rules = Array.isArray(policy.rules) ? policy.rules : [];
  const sessionId = String(params.sessionId || "");

  const matchRule = (rule: any) => {
    const match = rule?.match || {};
    if (match.provider && String(match.provider).toLowerCase() !== params.provider.toLowerCase()) return false;
    if (match.chatType && String(match.chatType).toLowerCase() !== params.chatType.toLowerCase()) return false;
    if (match.keyPrefix && sessionId && !sessionId.startsWith(String(match.keyPrefix))) return false;
    return true;
  };

  for (const rule of rules) {
    if (!rule?.action) continue;
    if (matchRule(rule)) {
      return { allowed: rule.action !== "deny", rule };
    }
  }

  const defaultAction = String(policy.default || "allow").toLowerCase();
  return { allowed: defaultAction !== "deny" };
}
