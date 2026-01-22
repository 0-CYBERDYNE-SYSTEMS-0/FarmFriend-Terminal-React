import { Sequence, AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

// Scene 1: Title card
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: 80, color: 'white', opacity }}>Chapter 1</h1>
    </AbsoluteFill>
  );
};

// Scene 2: Content
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const translateX = interpolate(frame, [0, 30], [-1920, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `translateX(${translateX}px)` }}>
        <h2 style={{ fontSize: 60, color: '#e94560' }}>Building with Sequences</h2>
        <p style={{ fontSize: 30, color: 'white', marginTop: 20 }}>
          Multiple scenes in perfect timing
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: Outro
const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0.5, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
        <h1 style={{ fontSize: 80, color: '#e94560' }}>Thank You!</h1>
        <p style={{ fontSize: 40, color: 'white', marginTop: 20 }}>
          Made with Remotion
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Main composition using sequences
export const SequenceExample: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={60}>
        <Scene1 />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <Scene2 />
      </Sequence>
      <Sequence from={150} durationInFrames={60}>
        <Scene3 />
      </Sequence>
    </AbsoluteFill>
  );
};
