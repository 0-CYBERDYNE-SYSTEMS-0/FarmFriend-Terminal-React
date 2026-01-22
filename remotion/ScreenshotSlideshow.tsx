import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, staticFile } from 'remotion';
import styled from 'styled-components';

// ===== SCREENSHOT DATA =====

const SCREENSHOTS = [
  {
    file: 'Screenshot 2026-01-03 at 10.50.38.png',
    title: 'Autonomous Development Environment',
    subtitle: 'AI-powered terminal for any industry',
    startFrame: 0,
    endFrame: 120, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-10 at 17.28.15.png',
    title: 'Dual-Process Architecture',
    subtitle: 'Separates AI daemon from user interface',
    startFrame: 120,
    endFrame: 240, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-17 at 12.44.02.png',
    title: 'Universal Toolset',
    subtitle: '43 tools spanning coding, IoT, and automation',
    startFrame: 240,
    endFrame: 360, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-19 at 09.22.07.png',
    title: 'Skill Ecosystem',
    subtitle: 'Modular skills for any domain expertise',
    startFrame: 360,
    endFrame: 480, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-20 at 18.21.35.png',
    title: 'Production-Grade',
    subtitle: 'Battle-tested in real-world deployments',
    startFrame: 480,
    endFrame: 600, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-22 at 00.26.08.png',
    title: 'Multi-Modal Intelligence',
    subtitle: 'Process images, files, and code naturally',
    startFrame: 600,
    endFrame: 720, // 4 seconds
  },
  {
    file: 'Screenshot 2026-01-22 at 08.28.46.png',
    title: 'Your Invisible Assistant',
    subtitle: 'Build automation for farming, manufacturing, and beyond',
    startFrame: 720,
    endFrame: 900, // 6 seconds (longer final scene)
  },
];

// ===== STYLED COMPONENTS =====

const Background = styled(AbsoluteFill)`
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f2e 50%, #0d1117 100%);
`;

const ScreenshotContainer = styled(AbsoluteFill)`
  overflow: hidden;
`;

const ScreenshotImage = styled.img<{
  scale: number;
  opacity: number;
}>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(${props => props.scale});
  opacity: ${props => props.opacity};
  filter: saturate(1.1) contrast(1.05);
`;

const TextOverlay = styled.div<{ opacity: number }>`
  position: absolute;
  bottom: 120px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: ${props => props.opacity};
`;

const Title = styled.h1<{ opacity: number }>`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  font-size: 56px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 0, 0, 0.3);
  margin: 0 0 16px 0;
  letter-spacing: -1px;
  opacity: ${props => props.opacity};
`;

const Subtitle = styled.p<{ opacity: number }>`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
  font-size: 24px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  margin: 0;
  opacity: ${props => props.opacity};
`;

const AccentBar = styled.div<{ width: number }>`
  position: absolute;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, #00ff88 50%, transparent 100%);
  width: ${props => props.width}%;
`;

const GradientOverlay = styled(AbsoluteFill)`
  background: radial-gradient(circle at center, transparent 0%, rgba(10, 14, 39, 0.3) 100%);
  pointer-events: none;
`;

const Vignette = styled(AbsoluteFill)`
  background: radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%);
  pointer-events: none;
`;

// ===== MAIN COMPONENT =====

export const ScreenshotSlideshow: React.FC = () => {
  const frame = useCurrentFrame();
  const totalDuration = 900; // 30 seconds total

  // Find current screenshot
  const currentShot = SCREENSHOTS.find(
    (shot) => frame >= shot.startFrame && frame < shot.endFrame
  );

  if (!currentShot) return null;

  // Calculate progress within current shot
  const progress = (frame - currentShot.startFrame) / (currentShot.endFrame - currentShot.startFrame);

  // Ken Burns: Slow zoom from 1.0 to 1.15
  const scale = interpolate(progress, [0, 1], [1.0, 1.15], {
    extrapolateRight: false,
  });

  // Fade in/out
  const fadeIn = interpolate(
    frame,
    [currentShot.startFrame, currentShot.startFrame + 30],
    [0, 1]
  );

  const fadeOut = interpolate(
    frame,
    [currentShot.endFrame - 30, currentShot.endFrame],
    [1, 0]
  );

  const opacity = Math.min(fadeIn, fadeOut);

  // Text animations (staggered)
  const titleOpacity = interpolate(
    frame,
    [currentShot.startFrame + 15, currentShot.startFrame + 45],
    [0, 1]
  );

  const subtitleOpacity = interpolate(
    frame,
    [currentShot.startFrame + 20, currentShot.startFrame + 50],
    [0, 1]
  );

  const accentWidth = interpolate(frame, [currentShot.startFrame, currentShot.endFrame], [0, 80]);

  return (
    <Background>
      <ScreenshotContainer>
        <ScreenshotImage
          src={staticFile(currentShot.file)}
          scale={scale}
          opacity={opacity}
        />
      </ScreenshotContainer>

      <GradientOverlay />
      <Vignette />

      <TextOverlay opacity={opacity}>
        <Title opacity={titleOpacity}>{currentShot.title}</Title>
        <Subtitle opacity={subtitleOpacity}>{currentShot.subtitle}</Subtitle>
      </TextOverlay>

      <AccentBar width={accentWidth} />
    </Background>
  );
};
