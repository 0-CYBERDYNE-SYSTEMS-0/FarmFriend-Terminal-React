#!/usr/bin/env node
/**
 * Test script to verify the entire TTS pipeline:
 * 1. Connect to daemon
 * 2. Send a simple prompt
 * 3. Capture chunks and test TTS synthesis
 */

import WebSocket from 'ws';
import { spawn } from 'child_process';

const WS_PORT = 28888;
const TTS_PORT = 8000;

async function testTtsService() {
  console.log('1. Testing TTS service health...');
  try {
    const response = await fetch(`http://localhost:${TTS_PORT}/api/voices`);
    if (response.ok) {
      console.log('   ✓ TTS service is running');
      const data = await response.json();
      console.log(`   ✓ Available voices: ${data.voices.length}`);
      return true;
    }
  } catch (err) {
    console.log('   ✗ TTS service not responding');
    return false;
  }
}

async function testSynthesize() {
  console.log('\n2. Testing audio synthesis...');
  try {
    const response = await fetch(`http://localhost:${TTS_PORT}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, this is a test.',
        mode: 'preset',
        voice: 'af_heart',
        speed: 1.0,
        temperature: 0.7,
        audio_format: 'wav'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Audio generated: ${data.filename}`);
      console.log(`   ✓ Duration: ${data.duration}s`);
      return data.filename;
    }
  } catch (err) {
    console.log('   ✗ Synthesis failed:', err.message);
  }
  return null;
}

async function testPlayback(filename) {
  console.log('\n3. Testing audio playback...');
  const audioUrl = `http://localhost:${TTS_PORT}/api/download/${filename}`;

  try {
    const response = await fetch(audioUrl);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`   ✓ Downloaded audio: ${buffer.length} bytes`);

      // Write to temp file and play
      const fs = await import('fs');
      const os = await import('os');
      const path = await import('path');
      const { promisify } = await import('util');
      const exec = promisify((await import('child_process')).exec);

      const tempFile = path.join(os.tmpdir(), `tts-test-${Date.now()}.wav`);
      fs.writeFileSync(tempFile, buffer);
      console.log(`   ✓ Written to: ${tempFile}`);

      console.log('   Playing audio...');
      await exec(`afplay "${tempFile}"`);
      console.log('   ✓ Playback complete');

      // Cleanup
      fs.unlinkSync(tempFile);
      return true;
    }
  } catch (err) {
    console.log('   ✗ Playback failed:', err.message);
  }
  return false;
}

async function testDaemonIntegration() {
  console.log('\n4. Testing daemon WebSocket integration...');

  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);

    let chunksReceived = 0;
    let contentChunks = 0;

    ws.on('open', () => {
      console.log('   ✓ Connected to daemon');
      ws.send(JSON.stringify({ type: 'hello', client: 'test' }));
      ws.send(JSON.stringify({ type: 'start_turn', input: 'Say hello' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'turn_started') {
        console.log(`   ✓ Turn started: ${msg.turnId}`);
      }

      if (msg.type === 'chunk') {
        chunksReceived++;
        if (msg.chunk.startsWith('content:')) {
          contentChunks++;
          const text = msg.chunk.slice('content:'.length);
          console.log(`   ✓ Content chunk: "${text}"`);
        }
      }

      if (msg.type === 'turn_finished') {
        console.log(`   ✓ Turn finished. Total chunks: ${chunksReceived}, content chunks: ${contentChunks}`);
        ws.close();
        resolve({ chunksReceived, contentChunks });
      }
    });

    ws.on('error', (err) => {
      console.log('   ✗ WebSocket error:', err.message);
      resolve({ error: err.message });
    });

    setTimeout(() => {
      console.log('   ✗ Timeout waiting for response');
      ws.close();
      resolve({ error: 'timeout' });
    }, 30000);
  });
}

async function main() {
  console.log('=== TTS Pipeline Test ===\n');

  const ttsOk = await testTtsService();
  if (!ttsOk) {
    console.log('\n❌ TTS service not running. Please start it first:');
    console.log('   cd /Users/scrimwiggins/_test && uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000');
    return;
  }

  const filename = await testSynthesize();
  if (!filename) {
    console.log('\n❌ Synthesis failed');
    return;
  }

  const playbackOk = await testPlayback(filename);
  if (!playbackOk) {
    console.log('\n❌ Playback failed');
    return;
  }

  const daemonResult = await testDaemonIntegration();
  if (daemonResult.error) {
    console.log(`\n⚠️  Daemon integration failed: ${daemonResult.error}`);
  } else if (daemonResult.contentChunks === 0) {
    console.log('\n⚠️  No content chunks received from daemon');
  } else {
    console.log(`\n✅ All tests passed!`);
  }
}

main().catch(console.error);
