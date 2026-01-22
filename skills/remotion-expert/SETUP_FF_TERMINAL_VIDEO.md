# FF-Terminal IoT Setup Video - Remotion

Create a professional demo video of FF-terminal running an IoT setup task.

## Quick Start

### 1. Create Remotion Project

```bash
npm init video ff-terminal-demo
cd ff-terminal-demo
npm install
```

### 2. Copy Video Component

Replace `src/Video.tsx` with the `ff-terminal-demo.tsx` file:

```bash
cp ff-terminal-demo.tsx src/Video.tsx
```

### 3. Update Root Component

Replace `src/Root.tsx`:

```tsx
export { RemotionRoot as default } from './Video';
```

### 4. Preview in Player

```bash
npm start
```

Opens at `http://localhost:3000` - you can scrub, play, and preview the animation.

## Rendering

### MP4 Output (Full Quality)

```bash
npx remotion render src/Video.tsx FFTerminalDemo ff-terminal-demo.mp4
```

### With Custom Settings

```bash
npx remotion render src/Video.tsx FFTerminalDemo ff-terminal-demo.mp4 \
  --fps 30 \
  --codec h264 \
  --bitrate 8M \
  --quality 100
```

### GIF Output (for sharing)

```bash
npx remotion render src/Video.tsx FFTerminalDemo ff-terminal-demo.gif \
  --codec gif \
  --frames 0-700
```

## Video Specifications

- **Duration**: ~47 seconds (1400 frames at 30fps)
- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Codec**: H.264 (MP4)

## Timeline Breakdown

| Time | Content |
|------|---------|
| 0:00 - 0:15 | Command typing: `npm run dev -- start iot-setup` |
| 0:15 - 0:35 | Daemon startup messages |
| 0:35 - 0:50 | IoT discovery initialization |
| 0:50 - 1:13 | Thinking process (analysis visualization) |
| 1:13 - 1:48 | Tool execution (device scanning, pairing) |
| 1:48 - 2:30 | Interactive device selection prompt |
| 2:30 - 2:50 | User input selection |
| 2:50 - 3:35 | Device configuration process |
| 3:35 - 3:55 | Success completion |
| 3:55 - 4:00+ | Ready prompt |

## Component Features

### Terminal Styling
- Dark gradient background (modern terminal theme)
- Monospace Monaco/Menlo font
- macOS-style window chrome (colored buttons)
- Proper line heights and spacing

### Animation Techniques
- **TypingText**: Character-by-character animation with blinking cursor
- **FadeInText**: Smooth opacity transitions with configurable timing
- **Sequence**: Staggers different sections
- **interpolate**: Precise control over timing

### Color Palette
- `#00ff88` - Bright green for user input
- `#61dafb` - Cyan for status messages
- `#4ade80` - Green for success
- `#fbbf24` - Amber for warnings
- `#c084fc` - Purple for thinking process
- `#06b6d4` - Cyan for tool execution
- `#e0e0e0` - Light gray for output text
- `#1a1a2e` - Dark background

## Customization

### Change Duration
Edit `durationInFrames` in RemotionRoot:
```tsx
durationInFrames={1400} // In frames at 30fps
```

### Adjust Typing Speed
Modify `charsPerFrame` in TypingText components:
```tsx
charsPerFrame={0.15} // Higher = faster typing
```

### Add Audio
```tsx
import { Audio } from 'remotion';

<Sequence from={0}>
  <Audio src="/path/to/audio.mp3" />
</Sequence>
```

## Troubleshooting

### Build Issues
- Clear cache: `rm -rf .remotion`
- Reinstall: `npm install`
- Check Node version: `node --version` (requires 16+)

### Player Won't Open
- Check port 3000: `lsof -ti:3000 | xargs kill`
- Restart: `npm start`

### Rendering Fails
- Ensure FFmpeg installed: `brew install ffmpeg`
- Check disk space for output file
- Try lower bitrate: `--bitrate 4M`

## Performance Tips

1. **Preview before rendering** - use player to validate timing
2. **Render at lower fps if needed** - 24fps also looks smooth
3. **Use H.264 codec** - best compression and compatibility
4. **Disable thumbnails during bulk render** - `--ignore-sequence` flag

## Next Steps

- Add voiceover: render video, add audio in post-production
- Create variations: duplicate and swap content for A/B testing
- Integrate with pipeline: use Remotion's Node API for automation
- Export as GIF: perfect for GitHub READMEs or social media
