import { useCurrentFrame, useVideoConfig, interpolate, Easing, AbsoluteFill } from 'remotion';

interface HelloWorldProps {
  titleText: string;
  titleColor: string;
}

export const HelloWorld: React.FC<HelloWorldProps> = ({ titleText, titleColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in animation
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Slide up animation
  const translateY = interpolate(frame, [0, 40], [100, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Scale animation
  const scale = interpolate(frame, [40, 60], [1, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  // Final scale back to normal
  const finalScale = interpolate(frame, [60, 80], [1.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  const combinedScale = frame < 60 ? scale : finalScale;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1
        style={{
          fontSize: 100,
          fontWeight: 'bold',
          color: titleColor,
          opacity,
          transform: `translateY(${translateY}px) scale(${combinedScale})`,
        }}
      >
        {titleText}
      </h1>
    </AbsoluteFill>
  );
};
