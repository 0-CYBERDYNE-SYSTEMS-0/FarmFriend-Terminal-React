export interface CommandFrontmatter {
  description?: string;
  "allowed-tools"?: string[];
  model?: string;
  "argument-hint"?: string;
  aliases?: string[];
}

export interface Command {
  slug: string;
  filePath: string;
  description: string;
  allowedTools?: string[];
  model?: string;
  argumentHint?: string;
  aliases?: string[];
  template: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommandParseResult {
  template: string;
  substituted: string;
  args: string[];
}
