type Args = {
  message?: string;
};

export async function quickUpdateTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const message = typeof args?.message === "string" ? args.message.trim() : "";
  if (!message) throw new Error("quick_update: missing message argument");
  return message;
}

