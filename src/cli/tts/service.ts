import { spawn, ChildProcess, exec } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ServiceStartResult {
  process: ChildProcess | null;
  ready: boolean;
  alreadyRunning: boolean;
}

const TTS_SERVICE_DIR = process.env.FF_TTS_SERVICE_DIR || '/Users/scrimwiggins/_test/';
const TTS_SERVICE_PORT = process.env.FF_TTS_SERVICE_PORT || '8000';

/**
 * Check if a process is listening on the specified port.
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -ti :${port}`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Start the mlx-audio-tts FastAPI service as a child process.
 * If a service is already running on the port, use that instead of spawning a new one.
 * Spawns: cd $TTS_SERVICE_DIR && uv run uvicorn backend.main:app --host 127.0.0.1 --port $TTS_SERVICE_PORT
 */
export async function startTtsService(): Promise<ServiceStartResult> {
  // First check if TTS service is already running
  const portInUse = await isPortInUse(parseInt(TTS_SERVICE_PORT));
  if (portInUse) {
    console.log('[TTS Service] Port already in use, checking if service is responsive...');
    const alreadyRunning = await waitForServiceReady(parseInt(TTS_SERVICE_PORT), 2, 500);
    if (alreadyRunning) {
      console.log('[TTS Service] Using existing service');
      return { process: null, ready: true, alreadyRunning: true };
    }
    // Port is in use but not our service - kill whatever is on it
    console.log('[TTS Service] Port in use by non-TTS process, killing it...');
    try {
      const { stdout } = await execAsync(`lsof -ti :${TTS_SERVICE_PORT}`);
      const pid = stdout.trim();
      if (pid) {
        execAsync(`kill ${pid}`);
        await new Promise(r => setTimeout(r, 500)); // Wait for port to be released
      }
    } catch {
      // Ignore errors
    }
  }

  return new Promise((resolve) => {
    // Verify service directory exists
    if (!existsSync(TTS_SERVICE_DIR)) {
      console.error(`TTS service directory not found: ${TTS_SERVICE_DIR}`);
      resolve({ process: null, ready: false, alreadyRunning: false });
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
      resolve({ process: proc, ready: false, alreadyRunning: false });
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
      // Only log actual errors, not informational messages
      if (output.includes('ERROR') || output.includes('error')) {
        console.error('[TTS Service Error]', output);
      }
    });

    // Wait for service health check
    waitForServiceReady(parseInt(TTS_SERVICE_PORT), 10, 500).then((ready) => {
      resolve({ process: proc, ready, alreadyRunning: false });
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
