type Args = {
  message?: string;
  update_type?: string;
  duration?: number;
};

export async function quickUpdateTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const message = typeof args?.message === "string" ? args.message.trim() : "";
  if (!message) throw new Error("quick_update: missing args.message");
  const updateType = typeof args?.update_type === "string" ? args.update_type.trim() : "status";
  const duration = typeof args?.duration === "number" && Number.isFinite(args.duration) ? args.duration : 2.0;
  return JSON.stringify({ message, update_type: updateType, duration }, null, 2);
}

