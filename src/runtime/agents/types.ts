export type OperationMode = "auto" | "confirm" | "read_only" | "planning";

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPromptAddition: string;

  // Tool restrictions (optional)
  allowedTools?: string[];
  deniedTools?: string[];

  // Behavior
  mode?: OperationMode;
  model?: string; // "inherit" = use parent's model
  maxTurns?: number;

  // Metadata
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Omit<AgentConfig, "id" | "createdAt" | "updatedAt">;
}
