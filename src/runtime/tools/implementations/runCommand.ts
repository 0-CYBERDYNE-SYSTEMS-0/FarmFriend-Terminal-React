import { spawn } from "node:child_process";

type Args = {
  command?: string;
  skill_directory?: string;
};

export async function runCommandTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const command = typeof args?.command === "string" ? args.command : "";
  if (!command.trim()) throw new Error("run_command: missing args.command");

  // Enabled by default per product policy.

  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const chunksOut: Buffer[] = [];
    const chunksErr: Buffer[] = [];
    const MAX = 2 * 1024 * 1024; // 2MB per stream

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (b: Buffer) => {
      chunksOut.push(b);
      const size = chunksOut.reduce((n, c) => n + c.length, 0);
      if (size > MAX) child.kill("SIGTERM");
    });

    child.stderr?.on("data", (b: Buffer) => {
      chunksErr.push(b);
      const size = chunksErr.reduce((n, c) => n + c.length, 0);
      if (size > MAX) child.kill("SIGTERM");
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code, sig) => {
      signal.removeEventListener("abort", onAbort);
      const stdout = Buffer.concat(chunksOut).toString("utf8");
      const stderr = Buffer.concat(chunksErr).toString("utf8");
      resolve(JSON.stringify({ command, exitCode: code, signal: sig, stdout, stderr }, null, 2));
    });
  });
}
