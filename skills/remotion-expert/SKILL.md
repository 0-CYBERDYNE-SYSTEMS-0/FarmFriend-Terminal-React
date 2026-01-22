---
name: remotion-expert
description: Expert in Remotion framework for programmatically creating videos using React components. Generate MP4s, GIFs, and animated content from React code with audio, transitions, and complex animations. Use for creating demo videos, UI recordings, product tours, and any programmatic video generation needs.
---

# Remotion Expert Skill

You are an expert in **Remotion** (remotion.dev) - the framework for creating videos programmatically using React.

**Purpose**: Remotion allows you to render videos, animations, and demos directly from React components without screen recording. Create high-quality MP4s, GIFs, and web videos with full control over timing, effects, and assets.

**Key Capabilities**:
- Programmatic video creation from React components
- MP4 and GIF export
- Audio synchronization
- Transitions and animations
- Real UI component rendering (no mocking needed)
- Frame-perfect control

## Core Concepts

### Installation & Setup

```bash
npm init video --name=my-video
# or add to existing project:
npm install remotion @remotion/cli
```

### Project Structure

```
my-video/
├─ src/
│  ├─ Root.tsx          # Root component (registry)
│  ├─ Video.tsx         # Your composition
│  └─ ...
├─ public/              # Static assets
├─ package.json
└─ remotion.config.ts   # Config
```

### Basic Composition

```tsx
import { Composition } from 'remotion';
import { MyVideo } from './Video';

export const RemotionRoot = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### Video Component with Animations

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Linear interpolation
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Spring physics (similar to react-motion)
  const scale = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
    },
  });

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      <h1>Frame {frame}</h1>
    </div>
  );
};
```

## Key Remotion APIs

### Timing & Interpolation

```tsx
import { useCurrentFrame, interpolate, Easing } from 'remotion';

const frame = useCurrentFrame();

// Basic interpolation
const x = interpolate(frame, [0, 100], [0, 500]);

// With easing
const opacity = interpolate(
  frame,
  [0, 30, 70, 100],
  [0, 1, 1, 0],
  {
    easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }
);
```

### Spring Physics

```tsx
import { spring } from 'remotion';

const scale = spring({
  frame,
  fps,
  from: 0,
  to: 1,
  config: {
    damping: 200,     // Higher = less oscillation
    stiffness: 100,   // Higher = faster
    mass: 1,
  },
});
```

### Sequences & Timing

```tsx
import { Sequence, AbsoluteFill } from 'remotion';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={60}>
        <Scene1 />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <Scene2 />
      </Sequence>
      <Sequence from={150}>
        <Scene3 />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### Audio Integration

```tsx
import { Audio, useCurrentFrame, interpolate } from 'remotion';

export const MyVideo = () => {
  const frame = useCurrentFrame();

  // Fade audio in/out
  const volume = interpolate(frame, [0, 30, 270, 300], [0, 1, 1, 0]);

  return (
    <>
      <Audio src="/audio/soundtrack.mp3" volume={volume} />
      {/* Your video content */}
    </>
  );
};
```

### Static Assets

```tsx
import { Img, staticFile } from 'remotion';

export const MyVideo = () => {
  return (
    <Img
      src={staticFile('logo.png')}
      style={{ width: 200, height: 200 }}
    />
  );
};
```

## Rendering Videos

### Development Preview

```bash
npm start
# Opens player at http://localhost:3000
```

### Render MP4

```bash
npm run build
# or with npx:
npx remotion render src/index.tsx MyVideo output.mp4
```

### Render GIF

```bash
npx remotion render src/index.tsx MyVideo output.gif --codec gif
```

### Custom Configuration

```bash
npx remotion render src/index.tsx MyVideo output.mp4 \
  --fps 60 \
  --codec h264 \
  --bitrate 8M \
  --concurrency 4
```

## Common Patterns

### Text Animation

```tsx
export const TextReveal = () => {
  const frame = useCurrentFrame();

  const translateY = interpolate(
    frame,
    [0, 30],
    [100, 0],
    { extrapolateRight: 'clamp' }
  );

  const opacity = interpolate(
    frame,
    [0, 20],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  return (
    <h1 style={{
      transform: `translateY(${translateY}px)`,
      opacity,
      fontSize: 72,
      fontWeight: 'bold',
    }}>
      Hello World
    </h1>
  );
};
```

### Progress Bar

```tsx
export const ProgressBar = ({ duration }: { duration: number }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, duration], [0, 100], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ width: '80%', height: 20, background: '#ddd' }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
        transition: 'width 0.3s',
      }} />
    </div>
  );
};
```

### Camera/Zoom Effect

```tsx
export const ZoomEffect = ({ children }: { children: React.ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoom = spring({
    frame,
    fps,
    from: 1,
    to: 1.5,
    config: { damping: 100, stiffness: 50 },
  });

  return (
    <div style={{ transform: `scale(${zoom})` }}>
      {children}
    </div>
  );
};
```

## Best Practices

1. **Performance**: Use `<AbsoluteFill>` for full-screen layouts
2. **Reusability**: Create small, composable components
3. **Timing**: Use `durationInFrames` and `fps` consistently
4. **Assets**: Place in `public/` and use `staticFile()`
5. **Testing**: Preview in player before rendering
6. **Codecs**: Use H264 for MP4, GIF for short animations
7. **Resolution**: Standard is 1920x1080 at 30fps

## Integration with Real Components

You can import and render your actual app components:

```tsx
import { MyDashboard } from '../app/components/Dashboard';
import { Sequence } from 'remotion';

export const AppDemo = () => {
  return (
    <Sequence from={0} durationInFrames={300}>
      <MyDashboard mockData={demoData} />
    </Sequence>
  );
};
```

## When Generating Code

- Always provide complete, working Remotion compositions
- Include proper imports and TypeScript types
- Use `useCurrentFrame()` for all animations
- Provide rendering commands
- Consider audio sync if applicable
- Test timing with different fps values
- Explain frame ranges and interpolation logic

## Common Use Cases

- Product demo videos
- UI interaction recordings
- Tutorial videos with voiceover
- Animated explainer content
- Data visualizations over time
- Social media video content
- Automated video generation pipelines

---

**Learn More**: https://remotion.dev
