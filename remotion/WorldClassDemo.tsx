import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, staticFile } from 'remotion';
import styled from 'styled-components';

// ===== SCREENSHOT DATA =====
// 8 optimized screenshots for smooth performance

const SCREENSHOTS = [
  {
    file: 'Screenshot 2025-09-29 at 23.15.00.png',
    title: 'WHERE IT ALL BEGAN',
    subtitle: 'September 2025',
    desc: 'The first version. Simple, powerful.',
    startFrame: 0,
    endFrame: 150, // 5 seconds
  },
  {
    file: 'Screenshot 2025-10-21 at 23.29.51.png',
    title: 'CODE GENERATION',
    subtitle: 'October 2025',
    desc: 'The system learns to write its own code',
    startFrame: 150,
    endFrame: 300, // 5 seconds
  },
  {
    file: 'Screenshot 2025-11-01 at 12.00.03.png',
    title: 'MULTI-PROCESS ARCHITECTURE',
    subtitle: 'November 2025',
    desc: 'Separating AI from UI for performance',
    startFrame: 300,
    endFrame: 450, // 5 seconds
  },
  {
    file: 'Screenshot 2025-11-28 at 13.42.04.png',
    title: 'SKILL SYSTEM EMERGES',
    subtitle: 'November 2025',
    desc: 'Modular skills for any industry',
    startFrame: 450,
    endFrame: 600, // 5 seconds
  },
  {
    file: 'Screenshot 2025-12-06 at 01.07.47.png',
    title: 'MACHINE LEARNING INTEGRATION',
    subtitle: 'December 2025',
    desc: 'Learning from every interaction',
    startFrame: 600,
    endFrame: 750, // 5 seconds
  },
  {
    file: 'Screenshot 2025-12-29 at 14.04.38.png',
    title: 'CROSS-DOMAIN AWARENESS',
    subtitle: 'December 2025',
    desc: 'One system. Any industry. Any task.',
    startFrame: 750,
    endFrame: 900, // 5 seconds
  },
  {
    file: 'Screenshot 2026-01-01 at 14.14.02.png',
    title: 'INVISIBLE ASSISTANT CONCEPT',
    subtitle: 'January 2026',
    desc: 'AI that works in the background. Always.',
    startFrame: 900,
    endFrame: 1050, // 5 seconds
  },
  {
    file: 'Screenshot 2026-01-22 at 08.28.46.png',
    title: 'THIS IS FARM FRIEND TERMINAL',
    subtitle: 'The Future Is Here',
    desc: 'Autonomous AI. Production-Grade. Ready.',
    startFrame: 1050,
    endFrame: 1200, // 5 seconds final
  },
];

// ===== STYLED COMPONENTS =====

const Background = styled(AbsoluteFill)`
  background: #000000;
`;

const ShotContainer = styled(AbsoluteFill)`
  overflow: hidden;
`;

const MainImage = styled.img<{
  scale: number;
  opacity: number;
}>`
  position: absolute;
  width: 110%;
  height: 110%;
  left: -5%;
  top: -5%;
  object-fit: cover;
  transform: scale(${props => props.scale});
  opacity: ${props => props.opacity};
`;

const ImageOverlay = styled(AbsoluteFill)`
  background: radial-gradient(circle at 30% 40%, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
`;

const CinematicBars = styled(AbsoluteFill)`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
`;

const TopBar = styled.div`
  height: 60px;
  background: #000000;
`;

const BottomBar = styled.div`
  height: 60px;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TextContainer = styled.div<{ opacity: number }>`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 80px 100px;
  opacity: ${props => props.opacity};
`;

const TopText = styled.div<{ opacity: number }>`
  text-align: center;
  opacity: ${props => props.opacity};
`;

const MonthYear = styled.div`
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #00ff88;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const MainTitle = styled.h1<{ opacity: number }>`
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 72px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.1;
  margin: 0;
  letter-spacing: -3px;
  text-shadow: 0 0 60px rgba(255, 255, 255, 0.3);
  opacity: ${props => props.opacity};
`;

const BottomText = styled.div<{ opacity: number }>`
  text-align: center;
  opacity: ${props => props.opacity};
`;

const Description = styled.p<{ opacity: number }>`
  font-family: 'SF Pro Text', -apple-system, sans-serif;
  font-size: 28px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
  letter-spacing: -0.5px;
  opacity: ${props => props.opacity};
`;

const CTAText = styled.div<{ opacity: number }>`
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #00ff88;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: ${props => props.opacity};
`;

// ===== MAIN COMPONENT =====

export const WorldClassDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const totalDuration = 1200; // 40 seconds

  // Find current shot
  const currentShot = SCREENSHOTS.find(
    (shot) => frame >= shot.startFrame && frame < shot.endFrame
  );

  if (!currentShot) return null;

  // Calculate progress within current shot
  const shotProgress = (frame - currentShot.startFrame) / (currentShot.endFrame - currentShot.startFrame);

  // ===== OPTIMIZED ANIMATIONS =====

  // Simple scale (no blur, no rotate for performance)
  const scale = interpolate(shotProgress, [0, 1], [1.0, 1.2]);

  // Smooth transitions
  const fadeIn = interpolate(frame, [currentShot.startFrame - 15, currentShot.startFrame + 15], [0, 1]);
  const fadeOut = interpolate(frame, [currentShot.endFrame - 20, currentShot.endFrame + 20], [1, 0]);
  const shotOpacity = Math.min(fadeIn, fadeOut);

  // Text animations (staggered for effect)
  const monthYearOpacity = interpolate(frame, [currentShot.startFrame, currentShot.startFrame + 20], [0, 1]);
  const titleOpacity = interpolate(frame, [currentShot.startFrame + 5, currentShot.startFrame + 30], [0, 1]);
  const descOpacity = interpolate(frame, [currentShot.startFrame + 15, currentShot.startFrame + 40], [0, 1]);
  const ctaOpacity = frame >= 1100 ? interpolate(frame, [1100, 1140], [0, 1]) : 0;

  return (
    <Background>
      <ShotContainer>
        <MainImage
          src={staticFile(currentShot.file)}
          scale={scale}
          opacity={shotOpacity}
        />
        <ImageOverlay />
      </ShotContainer>

      <TextContainer opacity={shotOpacity}>
        <TopText>
          <MonthYear opacity={monthYearOpacity}>{currentShot.subtitle}</MonthYear>
          <MainTitle opacity={titleOpacity}>{currentShot.title}</MainTitle>
        </TopText>

        <BottomText>
          <Description opacity={descOpacity}>{currentShot.desc}</Description>
          {currentShot.startFrame >= 1050 && (
            <CTAText opacity={ctaOpacity}>BUILD THE FUTURE WITH FF TERMINAL</CTAText>
          )}
        </BottomText>
      </TextContainer>

      <CinematicBars>
        <TopBar />
        <BottomBar />
      </CinematicBars>
    </Background>
  );
};
