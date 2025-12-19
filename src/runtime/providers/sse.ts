export async function* readSSEDataLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // Some servers use CRLF; normalize to LF so we can split on "\n\n".
    buf = buf.replace(/\r\n/g, "\n");

    while (true) {
      const sepIndex = buf.indexOf("\n\n");
      if (sepIndex === -1) break;
      const rawEvent = buf.slice(0, sepIndex);
      buf = buf.slice(sepIndex + 2);

      // Extract concatenated data: lines.
      const dataLines = rawEvent
        .split("\n")
        .map((l) => l.trimEnd())
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice("data:".length).trimStart());

      if (!dataLines.length) continue;
      yield dataLines.join("\n");
    }
  }

  // Flush any trailing event that didn't end with a blank line.
  if (buf.trim().length) {
    const rawEvent = buf.replace(/\r\n/g, "\n");
    const dataLines = rawEvent
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice("data:".length).trimStart());
    if (dataLines.length) {
      yield dataLines.join("\n");
    }
  }
}
