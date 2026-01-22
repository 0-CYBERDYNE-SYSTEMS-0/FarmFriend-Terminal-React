#!/usr/bin/env node

/**
 * Remotion Preview Script
 *
 * Usage:
 *   node remotion/preview-remotion.mjs          # Preview in browser
 *   node remotion/preview-remotion.mjs --render  # Render to MP4
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..'); // Go up to project root

const MODE = process.argv.includes('--render') ? 'render' : 'preview';

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║  🎬 FF Terminal - Remotion Video Demo (30 seconds)                    ║
║                                                                        ║
║  Mode: ${MODE.padEnd(10)}                                            ║
║  FPS: 30                                                              ║
║  Resolution: 1920x1080                                                  ║
║  Duration: 30s (900 frames)                                             ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════╝
`);

const args = MODE === 'render'
  ? ['remotion', 'render', 'remotion/Root.tsx', 'FFTdemo', path.join(rootDir, 'out', 'ff-terminal-demo.mp4')]
  : ['remotion', 'studio', 'remotion/Root.tsx'];

console.log(`🚀 Starting Remotion ${MODE}...`);
console.log('');

const child = spawn('npx', args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('');
    console.log('✅ Done!');

    if (MODE === 'render') {
      const outputPath = path.join(rootDir, 'out', 'ff-terminal-demo.mp4');
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`📁 Output: ${outputPath}`);
        console.log(`📊 File size: ${sizeMB} MB`);
      }
    }
  } else {
    console.error(`❌ Remotion exited with code ${code}`);
  }
  process.exit(code || 0);
});
