# Remotion Example Templates

These templates demonstrate core Remotion concepts for programmatic video creation.

## Files

### `basic-composition.tsx`
- Shows how to register compositions in the Root component
- Configure video dimensions, fps, and duration
- Pass props to compositions

### `hello-world.tsx`
- Simple text animation with fade in and slide up
- Demonstrates `interpolate()` with easing functions
- Basic AbsoluteFill layout

### `spring-animation.tsx`
- Physics-based animations using `spring()`
- Similar to react-motion but for video frames
- Configure damping, stiffness, and mass

### `sequence-example.tsx`
- Multiple scenes using `<Sequence>`
- Precise timing control between scenes
- Transitions and scene composition

### `with-audio.tsx`
- Audio integration with volume control
- Fade in/out audio with interpolation
- Sync visuals with sound

## Usage

1. Copy the desired template to your Remotion project's `src/` directory
2. Import and register in your `Root.tsx`
3. Preview with `npm start`
4. Render with `npx remotion render`

## Example Project Setup

```bash
npm init video --name=my-demo
cd my-demo
# Copy templates to src/
npm start
```

## Rendering

```bash
# Render to MP4
npx remotion render src/index.tsx MyComposition output.mp4

# Render to GIF
npx remotion render src/index.tsx MyComposition output.gif --codec gif

# Custom settings
npx remotion render src/index.tsx MyComposition output.mp4 \
  --fps 60 \
  --codec h264 \
  --bitrate 10M
```

## Learn More

Visit https://remotion.dev for complete documentation.
