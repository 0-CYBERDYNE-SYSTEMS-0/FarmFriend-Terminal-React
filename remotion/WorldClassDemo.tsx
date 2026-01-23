import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, Audio } from 'remotion';
import styled from 'styled-components';

// ===== SCREENSHOT DATA =====
// 12 screenshots from Sept 2025 - Jan 2026 showing FF Terminal evolution

const SCREENSHOTS = [
  {
    file: 'Screenshot 2025-09-29 at 23.15.00.png',
    title: 'WHERE IT ALL BEGAN',
    subtitle: 'September 2025',
    desc: 'The first version. Simple, powerful.',
    startFrame: 0,
    endFrame: 90,
  },
  {
    file: 'Screenshot 2025-10-03 at 12.39.40.png',
    title: 'EVOLVING INTELLIGENCE',
    subtitle: 'October 2025',
    desc: 'Adding natural language understanding',
    startFrame: 90,
    endFrame: 180,
  },
  {
    file: 'Screenshot 2025-10-21 at 23.29.51.png',
    title: 'CODE GENERATION',
    subtitle: 'Writing Code',
    desc: 'The system learns to write its own code',
    startFrame: 180,
    endFrame: 270,
  },
  {
    file: 'Screenshot 2025-11-01 at 12.00.03.png',
    title: 'MULTI-PROCESS ARCHITECTURE',
    subtitle: 'Dual-Core Design',
    desc: 'Separating AI from UI for performance',
    startFrame: 270,
    endFrame: 360,
  },
  {
    file: 'Screenshot 2025-11-07 at 20.15.37.png',
    title: 'TOOL ECOSYSTEM BORN',
    subtitle: 'Building Power',
    desc: 'The first tools connect to the world',
    startFrame: 360,
    endFrame: 450,
  },
  {
    file: 'Screenshot 2025-11-28 at 13.42.04.png',
    title: 'SKILL SYSTEM EMERGES',
    subtitle: 'Domain Expertise',
    desc: 'Modular skills for any industry',
    startFrame: 450,
    endFrame: 540,
  },
  {
    file: 'Screenshot 2025-12-04 at 16.29.20.png',
    title: 'REAL-WORLD DEPLOYMENT',
    subtitle: 'Production Ready',
    desc: 'Running on actual farms. Real data.',
    startFrame: 540,
    endFrame: 630,
  },
  {
    file: 'Screenshot 2025-12-06 at 01.07.47.png',
    title: 'MACHINE LEARNING INTEGRATION',
    subtitle: 'Getting Smarter',
    desc: 'Learning from every interaction',
    startFrame: 630,
    endFrame: 720,
  },
  {
    file: 'Screenshot 2025-12-29 at 14.04.38.png',
    title: 'CROSS-DOMAIN AWARENESS',
    subtitle: 'Universal Intelligence',
    desc: 'One system. Any industry. Any task.',
    startFrame: 720,
    endFrame: 810,
  },
  {
    file: 'Screenshot 2025-12-31 at 00.55.14.png',
    title: 'NEW YEAR BREAKTHROUGH',
    subtitle: 'January 1, 2026',
    desc: 'The foundation is solid. Scaling begins.',
    startFrame: 810,
    endFrame: 900,
  },
  {
    file: 'Screenshot 2026-01-01 at 14.14.02.png',
    title: 'INVISIBLE ASSISTANT CONCEPT',
    subtitle: 'The Vision',
    desc: 'AI that works in the background. Always.',
    startFrame: 900,
    endFrame: 990,
  },
  {
    file: 'Screenshot 2026-01-22 at 08.28.46.png',
    title: 'THIS IS FARM FRIEND TERMINAL',
    subtitle: 'The Future Is Here',
    desc: 'Autonomous AI. Production-Grade. Ready.',
    startFrame: 990,
    endFrame: 1200, // Final scene: 7 seconds
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
  rotate: number;
  blur: number;
}>`
  position: absolute;
  width: 110%;
  height: 110%;
  left: -5%;
  top: -5%;
  object-fit: cover;
  transform: scale(${props => props.scale}) rotate(${props => props.rotate}deg);
  filter: blur(${props => props.blur}px);
  opacity: ${props => props.opacity};
  transition: all 0.3s ease;
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

const ParticleLayer = styled(AbsoluteFill)`
  pointer-events: none;
  opacity: 0.3;
`;

const Particle = styled.div<{ x: number; y: number; opacity: number; scale: number }>`
  position: absolute;
  left: ${props => props.x}%;
  top: ${props => props.y}%;
  width: 4px;
  height: 4px;
  background: #00ff88;
  border-radius: 50%;
  transform: scale(${props => props.scale});
  opacity: ${props => props.opacity};
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
`;

const ScanLine = styled.div<{ y: number; opacity: number }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 136, 0.8) 50%, transparent 100%);
  top: ${props => props.y}%;
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

  // ===== ANIMATIONS =====

  // Multi-layered scale + rotate for drama
  const scale = interpolate(shotProgress, [0, 1], [1.0, 1.25]);
  const rotate = interpolate(shotProgress, [0, 1], [0, 2]); // Subtle 2° rotation
  const blur = interpolate(shotProgress, [0, 0.3, 0.7, 1], [0, 0, 0, 0.5]); // Clear → blur at end

  // Cinematic transitions (cross-dissolve feel)
  const fadeIn = interpolate(frame, [currentShot.startFrame - 15, currentShot.startFrame + 15], [0, 1]);
  const fadeOut = interpolate(frame, [currentShot.endFrame - 20, currentShot.endFrame + 20], [1, 0]);
  const shotOpacity = Math.min(fadeIn, fadeOut);

  // Text animations (dramatic entrance)
  const monthYearOpacity = interpolate(frame, [currentShot.startFrame, currentShot.startFrame + 20], [0, 1]);
  const titleOpacity = interpolate(frame, [currentShot.startFrame + 5, currentShot.startFrame + 30], [0, 1]);
  const descOpacity = interpolate(frame, [currentShot.startFrame + 15, currentShot.startFrame + 40], [0, 1]);
  const ctaOpacity = frame >= 1100 ? interpolate(frame, [1100, 1140], [0, 1]) : 0;

  // Scan line effect (subtle movement)
  const scanLineY = (frame % 60) / 60 * 100;
  const scanLineOpacity = interpolate(shotProgress, [0, 0.8], [0.4, 0]);

  // Particles (dynamic background)
  const particles = Array.from({ length: 8 }, (_, i) => {
    const particleX = 10 + (i * 12) + Math.sin(frame * 0.01 + i) * 5;
    const particleY = 10 + (i * 10) + Math.cos(frame * 0.01 + i * 2) * 5;
    const particleScale = 1 + Math.sin(frame * 0.02 + i * 3) * 0.3;
    const particleOpacity = 0.2 + Math.sin(frame * 0.01 + i) * 0.1;

    return (
      <Particle
        key={`particle-${i}`}
        x={particleX}
        y={particleY}
        scale={particleScale}
        opacity={particleOpacity}
      />
    );
  });

  return (
    <Background>
      <ShotContainer>
        <MainImage
          src={currentShot.file}
          scale={scale}
          opacity={shotOpacity}
          rotate={rotate}
          blur={blur}
        />
        <ImageOverlay />
      </ShotContainer>

      <ParticleLayer>
        {particles}
      </ParticleLayer>

      {shotProgress < 0.85 && (
        <ScanLine y={scanLineY} opacity={scanLineOpacity} />
      )}

      <TextContainer opacity={shotOpacity}>
        <TopText>
          <MonthYear opacity={monthYearOpacity}>{currentShot.subtitle}</MonthYear>
          <MainTitle opacity={titleOpacity}>{currentShot.title}</MainTitle>
        </TopText>

        <BottomText>
          <Description opacity={descOpacity}>{currentShot.desc}</Description>
          {currentShot.startFrame >= 990 && (
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
