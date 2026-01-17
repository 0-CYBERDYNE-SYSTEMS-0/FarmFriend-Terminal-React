export function buildWsUrls(sessionId: string): string[] {
  const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname || "localhost";
  const portRaw = window.location.port ? Number(window.location.port) : NaN;
  const hasPort = Number.isFinite(portRaw) && portRaw > 0;
  const basePort = hasPort ? portRaw : 8787;
  const primaryPort = basePort;
  const fallbackPort = hasPort && basePort > 1 ? basePort - 1 : null;

  const urls: string[] = [];
  urls.push(`${wsProtocol}://${host}:${primaryPort}/ws/terminal/${sessionId}`);
  if (fallbackPort && fallbackPort !== primaryPort) {
    urls.push(`${wsProtocol}://${host}:${fallbackPort}/ws/terminal/${sessionId}`);
  }

  return urls;
}
