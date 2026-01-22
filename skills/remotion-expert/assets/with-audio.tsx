import { Audio, useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

export const VideoWithAudio: React.FC = () => {
  const frame = useCurrentFrame();

  // Fade audio in at start
  const audioVolume = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Fade audio out at end (assuming 300 frame duration)
  const audioFadeOut = interpolate(frame, [270, 300], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  const finalVolume = Math.min(audioVolume, audioFadeOut);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      {/* Audio component with volume control */}
      <Audio
        src="/audio/soundtrack.mp3"
        volume={finalVolume}
        startFrom={0}
      />

      {/* Visual content */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 72, color: 'white' }}>
          Video with Audio
        </h1>
        <p style={{ fontSize: 32, color: '#888', marginTop: 20 }}>
          Frame: {frame}
        </p>
      </div>
    </AbsoluteFill>
  );
};

// Note: Place your audio file in the public/ directory
// Access it using staticFile() or absolute path in production
