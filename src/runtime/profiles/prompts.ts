/**
 * Prompt for a secret value with input masking.
 * Handles backspace and shows asterisks for each character.
 */
export async function promptSecret(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  const wasRaw = (stdin as any).isRaw;
  stdin.setRawMode?.(true);
  stdin.resume();

  try {
    return await new Promise((resolve) => {
      let value = "";
      const onData = (chunk: Buffer) => {
        const s = chunk.toString("utf8");
        for (const ch of s) {
          if (ch === "\r" || ch === "\n") {
            process.stdout.write("\n");
            stdin.off("data", onData);
            stdin.setRawMode?.(Boolean(wasRaw));
            resolve(value);
            return;
          }
          if (ch === "\u0003") {
            // Ctrl+C
            process.stdout.write("\n");
            stdin.off("data", onData);
            stdin.setRawMode?.(Boolean(wasRaw));
            process.exit(0);
          }
          if (ch === "\x7f" || ch === "\b") {
            if (value.length > 0) {
              value = value.slice(0, -1);
              process.stdout.write("\b \b");
            }
          } else if (ch >= " ") {
            value += ch;
            process.stdout.write("*");
          }
        }
      };
      stdin.on("data", onData);
    });
  } finally {
    stdin.setRawMode?.(Boolean(wasRaw));
  }
}
