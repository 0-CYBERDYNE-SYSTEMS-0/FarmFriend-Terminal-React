import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface ServiceStartResult {
  process: ChildProcess;
  ready: boolean;
}

const TTS_SERVICE_DIR = process.env.FF_TTS_SERVICE_DIR || '/Users/scrimwiggins/_test/';
const TTS_SERVICE_PORT = process.env.FF_TTS_SERVICE_PORT || '8000';

/**
 * Start the mlx-audio-tts FastAPI service as a child process.
 * Spawns: cd $TTS_SERVICE_DIR && uv run uvicorn backend.main:app --host 127.0.0.1 --port $TTS_SERVICE_PORT
 */
export async function startTtsService(): Promise<ServiceStartResult> {
  return new Promise((resolve) => {
    // Verify service directory exists
    if (!existsSync(TTS_SERVICE_DIR)) {
      console.error(`TTS service directory not found: ${TTS_SERVICE_DIR}`);
      resolve({ process: null as any, ready: false });
      return;
    }

    // Spawn the service with shell to handle cd + command chain
    const proc = spawn('bash', [
      '-c',
      `cd "${TTS_SERVICE_DIR}" && uv run uvicorn backend.main:app --host 127.0.0.1 --port ${TTS_SERVICE_PORT}`
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Handle process errors
    proc.on('error', (err) => {
      console.error('Failed to start TTS service:', err);
      resolve({ process: proc, ready: false });
    });

    // Log service output
    proc.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Uvicorn running on')) {
        console.log('[TTS Service] Running');
      }
    });

    proc.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error('[TTS Service Error]', output);
    });

    // Wait for service health check
    waitForServiceReady(parseInt(TTS_SERVICE_PORT), 10, 500).then((ready) => {
      resolve({ process: proc, ready });
    });
  });
}

/**
 * Check if TTS service is healthy via health endpoint.
 */
async function waitForServiceReady(
  port: number,
  maxRetries: number = 10,
  retryDelay: number = 500
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/api/voices`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return true;
      }
    } catch (err) {
      // Service not ready yet, continue retry
    }
    await new Promise(r => setTimeout(r, retryDelay));
  }
  return false;
}

/**
 * Stop the TTS service gracefully.
 */
export async function stopTtsService(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.killed) {
      resolve();
      return;
    }

    proc.on('exit', () => {
      resolve();
    });

    // Try graceful shutdown first
    proc.kill('SIGTERM');

    // Force kill if not terminated within timeout
    const forceKillTimeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
      resolve();
    }, 3000);

    proc.on('exit', () => {
      clearTimeout(forceKillTimeout);
      resolve();
    });
  });
}
