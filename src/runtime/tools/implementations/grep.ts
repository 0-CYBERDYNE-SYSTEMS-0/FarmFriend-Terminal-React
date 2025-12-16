import { spawn } from "node:child_process";

type Args = {
  pattern?: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: "content" | "files_with_matches" | "count";
  case_insensitive?: boolean;
  context_before?: number;
  context_after?: number;
  show_line_numbers?: boolean;
  head_limit?: number;
};

export async function grepTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const pattern = typeof args?.pattern === "string" ? args.pattern : "";
  if (!pattern.trim()) throw new Error("grep: missing args.pattern");

  const target = typeof args?.path === "string" && args.path.trim() ? args.path.trim() : ".";
  const outputMode = args.output_mode || "content";

  const cmdArgs: string[] = ["--color", "never"];
  if (args.case_insensitive) cmdArgs.push("-i");
  if (typeof args.context_before === "number" && args.context_before > 0) cmdArgs.push("-B", String(args.context_before));
  if (typeof args.context_after === "number" && args.context_after > 0) cmdArgs.push("-A", String(args.context_after));
  if (args.show_line_numbers !== false) cmdArgs.push("-n");

  if (typeof args.glob === "string" && args.glob.trim()) cmdArgs.push("--glob", args.glob.trim());
  if (typeof args.type === "string" && args.type.trim()) cmdArgs.push("--type", args.type.trim());

  if (outputMode === "files_with_matches") cmdArgs.push("--files-with-matches");
  if (outputMode === "count") cmdArgs.push("--count");

  // Pattern + path
  cmdArgs.push(pattern, target);

  const MAX = 2 * 1024 * 1024; // 2MB
  return await new Promise<string>((resolve, reject) => {
    const child = spawn("rg", cmdArgs, { stdio: ["ignore", "pipe", "pipe"] });

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let outSize = 0;
    let errSize = 0;

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (b) => {
      const buf = b as Buffer;
      out.push(buf);
      outSize += buf.length;
      if (outSize > MAX) child.kill("SIGTERM");
    });
    child.stderr.on("data", (b) => {
      const buf = b as Buffer;
      err.push(buf);
      errSize += buf.length;
      if (errSize > MAX) child.kill("SIGTERM");
    });

    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      const stdout = Buffer.concat(out).toString("utf8");
      const stderr = Buffer.concat(err).toString("utf8");

      // rg exits 1 when no matches (not an error).
      if (code === 0 || code === 1) {
        const lines = stdout.split("\n");
        const limited =
          typeof args.head_limit === "number" && args.head_limit > 0 ? lines.slice(0, args.head_limit).join("\n") : stdout;
        resolve(limited.trimEnd());
        return;
      }

      reject(new Error(stderr.trim() || `rg exited ${code}`));
    });
  });
}

