/**
 * Audio playback queue for sequential audio playback with interruption support.
 * Writes audio buffers to temp files and plays them via afplay (macOS).
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export class AudioPlaybackQueue {
  private queue: Buffer[] = [];
  private playing: boolean = false;
  private currentProcess: ChildProcess | null = null;

  /**
   * Enqueue audio buffer for playback.
   */
  enqueue(audio: Buffer): void {
    this.queue.push(audio);
    if (!this.playing) {
      this.playNext();
    }
  }

  /**
   * Interrupt current playback and clear queue.
   */
  interrupt(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
    }
    this.queue = [];
    this.playing = false;
  }

  /**
   * Check if currently playing audio.
   */
  isPlaying(): boolean {
    return this.playing || this.queue.length > 0;
  }

  /**
   * Play next audio in queue (private method).
   */
  private playNext(): void {
    if (this.queue.length === 0) {
      this.playing = false;
      return;
    }

    this.playing = true;
    const audio = this.queue.shift()!;

    // Write audio to temp file with timestamp
    const tmpFile = join(tmpdir(), `ff-tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);

    try {
      writeFileSync(tmpFile, audio);
    } catch (err) {
      console.error(`Failed to write audio file: ${err}`);
      this.playNext();
      return;
    }

    // Spawn afplay process
    this.currentProcess = spawn('afplay', [tmpFile], {
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: false
    });

    this.currentProcess.on('exit', (code) => {
      // Clean up temp file
      try {
        unlinkSync(tmpFile);
      } catch {
        // File might already be deleted
      }

      this.currentProcess = null;

      // Play next audio
      this.playNext();
    });

    this.currentProcess.on('error', (err) => {
      console.error(`Audio playback error: ${err}`);
      // Clean up and continue to next
      try {
        unlinkSync(tmpFile);
      } catch {
        // File might already be deleted
      }
      this.currentProcess = null;
      this.playNext();
    });
  }

  /**
   * Cleanup - interrupt playback and clear resources.
   */
  destroy(): void {
    this.interrupt();
  }
}
