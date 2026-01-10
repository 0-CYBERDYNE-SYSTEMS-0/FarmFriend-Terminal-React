import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../runtime/config/repoRoot.js";

const PORT = Number(process.env.FF_FIELDVIEW_PORT) || 8788;
const HOST = process.env.FF_FIELDVIEW_HOST || "localhost";

// FieldView frontend dist directory
const repoRoot = findRepoRoot();
// Check if running from source or dist
const isDevelopment = fs.existsSync(path.join(repoRoot, "src"));
const fieldviewDistDir = path.join(repoRoot, isDevelopment ? "src" : "dist", "web", "fieldview", "dist");

// Create WebSocket server for fieldview
const wsPort = PORT + 1000; // Use different port offset for WebSocket
const wss = new WebSocketServer({ port: wsPort });

console.log(`FieldView WebSocket server listening on ws://${HOST}:${PORT + 1}`);

// Connect to daemon WebSocket
let daemonWs: WebSocket | null = null;

function connectToDaemon() {
  const daemonPort = Number(process.env.FF_TERMINAL_PORT) || 28888;
  daemonWs = new WebSocket(`ws://localhost:${daemonPort}`);

  daemonWs.on("open", () => {
    console.log("FieldView connected to daemon");
    // Send hello message
    daemonWs!.send(JSON.stringify({
      type: "hello",
      client: "web",
      version: "1.0.0"
    }));
  });

  daemonWs.on("message", (data) => {
    // Broadcast daemon messages to all fieldview clients
    wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });

  daemonWs.on("close", () => {
    console.log("FieldView disconnected from daemon");
    // Reconnect after 3 seconds
    setTimeout(connectToDaemon, 3000);
  });

  daemonWs.on("error", (error) => {
    console.error("Daemon WebSocket error:", error);
  });
}

// Handle fieldview client connections
wss.on("connection", (ws: any) => {
  console.log("FieldView client connected");

  ws.on("message", (data: any) => {
    // Forward client messages to daemon
    if (daemonWs && daemonWs.readyState === WebSocket.OPEN) {
      daemonWs.send(data.toString());
    }
  });

  ws.on("close", () => {
    console.log("FieldView client disconnected");
  });
});

// Start connection to daemon
connectToDaemon();

// Create HTTP server for static files
const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  // Health endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }) + "\n");
    return;
  }

  // Serve static files from fieldview dist
  if (!fs.existsSync(fieldviewDistDir)) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("FieldView not built. Run 'npm run build:fieldview' first.\n");
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(fieldviewDistDir, rel);

  // Prevent path traversal
  if (!filePath.startsWith(fieldviewDistDir)) {
    res.writeHead(400);
    res.end();
    return;
  }

  let actualPath = filePath;
  if (!fs.existsSync(actualPath) || fs.statSync(actualPath).isDirectory()) {
    actualPath = path.join(fieldviewDistDir, "index.html");
  }

  try {
    const ext = path.extname(actualPath).toLowerCase();
    const contentType =
      ext === ".html"
        ? "text/html; charset=utf-8"
        : ext === ".js"
          ? "application/javascript; charset=utf-8"
          : ext === ".css"
            ? "text/css; charset=utf-8"
            : ext === ".svg"
              ? "image/svg+xml"
              : ext === ".json"
                ? "application/json; charset=utf-8"
                : "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(fs.readFileSync(actualPath));
  } catch {
    res.writeHead(500);
    res.end();
  }
});

export async function startFieldviewServer(): Promise<void> {
  return new Promise((resolve) => {
    // Start server
    server.listen(PORT, HOST, () => {
      console.log(`FieldView server listening on http://${HOST}:${PORT}`);
      resolve();
    });
  });
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    wss.close(() => {
      daemonWs?.close();
      process.exit(0);
    });
  });
});

// Start the server if this file is run directly
startFieldviewServer();