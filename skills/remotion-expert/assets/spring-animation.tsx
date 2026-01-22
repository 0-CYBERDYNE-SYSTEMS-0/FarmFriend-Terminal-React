import { useCurrentFrame, useVideoConfig, spring, AbsoluteFill } from 'remotion';

// Spring physics animation - similar to react-motion but for video
export const SpringAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bouncy entrance with spring physics
  const scale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Delayed rotation spring
  const rotation = spring({
    frame: frame - 20,
    fps,
    from: 0,
    to: 360,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0e27',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 200,
          height: 200,
          backgroundColor: '#ff6b35',
          borderRadius: 20,
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: 32,
          fontWeight: 'bold',
        }}
      >
        Spring!
      </div>
    </AbsoluteFill>
  );
};
