import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, staticFile } from 'remotion';
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
    endFrame: 100,
    color: '#00ff88', // Green
    panDirection: 'down',
  },
  {
    file: 'Screenshot 2025-10-03 at 12.39.40.png',
    title: 'EVOLVING INTELLIGENCE',
    subtitle: 'October 2025',
    desc: 'Adding natural language understanding',
    startFrame: 100,
    endFrame: 200,
    color: '#00d4ff', // Cyan
    panDirection: 'right',
  },
  {
    file: 'Screenshot 2025-10-21 at 23.29.51.png',
    title: 'CODE GENERATION',
    subtitle: 'October 2025',
    desc: 'The system learns to write its own code',
    startFrame: 200,
    endFrame: 300,
    color: '#ffd700', // Gold
    panDirection: 'left',
  },
  {
    file: 'Screenshot 2025-11-01 at 12.00.03.png',
    title: 'MULTI-PROCESS ARCHITECTURE',
    subtitle: 'November 2025',
    desc: 'Separating AI from UI for performance',
    startFrame: 300,
    endFrame: 400,
    color: '#ff6b6b', // Red
    panDirection: 'down',
  },
  {
    file: 'Screenshot 2025-11-07 at 20.15.37.png',
    title: 'TOOL ECOSYSTEM BORN',
    subtitle: 'November 2025',
    desc: 'The first tools connect to the world',
    startFrame: 400,
    endFrame: 500,
    color: '#a855f7', // Purple
    panDirection: 'right',
  },
  {
    file: 'Screenshot 2025-11-28 at 13.42.04.png',
    title: 'SKILL SYSTEM EMERGES',
    subtitle: 'November 2025',
    desc: 'Modular skills for any industry',
    startFrame: 500,
    endFrame: 600,
    color: '#a855f7', // Purple
    panDirection: 'right',
  },
  {
    file: 'Screenshot 2025-12-04 at 16.29.20.png',
    title: 'REAL-WORLD DEPLOYMENT',
    subtitle: 'December 2025',
    desc: 'Running on actual farms. Real data.',
    startFrame: 600,
    endFrame: 700,
    color: '#68d391', // Orange
    panDirection: 'left',
  },
  {
    file: 'Screenshot 2025-12-06 at 01.07.47.png',
    title: 'MACHINE LEARNING INTEGRATION',
    subtitle: 'December 2025',
    desc: 'Learning from every interaction',
    startFrame: 700,
    endFrame: 800,
    color: '#63b3ed', // Light Blue
    panDirection: 'down',
  },
  {
    file: 'Screenshot 2025-12-29 at 14.04.38.png',
    title: 'CROSS-DOMAIN AWARENESS',
    subtitle: 'December 2025',
    desc: 'One system. Any industry. Any task.',
    startFrame: 800,
    endFrame: 900,
    color: '#faf089', // Yellow
    panDirection: 'right',
  },
  {
    file: 'Screenshot 2025-12-31 at 00.55.14.png',
    title: 'NEW YEAR BREAKTHROUGH',
    subtitle: 'January 1, 2026',
    desc: 'The foundation is solid. Scaling begins.',
    startFrame: 900,
    endFrame: 1000,
    color: '#00ff88', // Green
    panDirection: 'left',
  },
  {
    file: 'Screenshot 2026-01-01 at 14.14.02.png',
    title: 'INVISIBLE ASSISTANT CONCEPT',
    subtitle: 'January 2026',
    desc: 'AI that works in the background. Always.',
    startFrame: 1000,
    endFrame: 1100,
    color: '#00d4ff', // Cyan
    panDirection: 'down',
  },
  {
    file: 'Screenshot 2026-01-22 at 08.28.46.png',
    title: 'THIS IS FARM FRIEND TERMINAL',
    subtitle: 'The Future Is Here',
    desc: 'Autonomous AI. Production-Grade. Ready.',
    startFrame: 1100,
    endFrame: 1200, // Final scene: 3.3 seconds
    color: '#00ff88', // Green (brand color)
    panDirection: 'center',
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
  x: number;
  y: number;
}>`
  position: absolute;
  width: 110%;
  height: 110%;
  object-fit: cover;
  transform: translate(${props => props.x}%, ${props => props.y}%) scale(${props => props.scale});
  opacity: ${props => props.opacity};
`;

const ImageOverlay = styled(AbsoluteFill)`
  background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
`;

const TextContainer = styled.div<{ opacity: number; color: string }>`
  position: absolute;
  bottom: 80px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: ${props => props.opacity};
`;

const ASCIITitle = styled.div<{ opacity: number }>`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Menlo', monospace;
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.color || '#00ff88'};
  background: rgba(0, 0, 0, 0.8);
  padding: 14px 28px;
  border-radius: 6px;
  border: 2px solid ${props => props.color || '#00ff88'};
  letter-spacing: 1px;
  text-shadow: 0 0 20px ${props => props.color || '#00ff88'};
  opacity: ${props => props.opacity};
`;

const ASCTIISubtitle = styled.div<{ opacity: number }>`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Menlo', monospace;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  margin-top: 10px;
  opacity: ${props => props.opacity};
`;

const Description = styled.p<{ opacity: number }>`
  font-family: 'SF Pro Text', -apple-system, sans-serif;
  font-size: 22px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 20px 0;
  letter-spacing: -0.5px;
  opacity: ${props => props.opacity};
`;

const CTAText = styled.div<{ opacity: number }>`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Menlo', monospace;
  font-size: 26px;
  font-weight: 800;
  color: #00ff88;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: rgba(0, 255, 136, 0.15);
  padding: 14px 36px;
  border: 2px solid #00ff88;
  border-radius: 24px;
  opacity: ${props => props.opacity};
`;

const ScanLine = styled.div<{ y: number; opacity: number; color: string }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: ${props => props.color};
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

  // ===== SMOOTH, CALM ANIMATIONS =====

  // Pan + very subtle zoom (1.0 to 1.05 - minimal!)
  let x = 0;
  let y = 0;
  const scale = interpolate(shotProgress, [0, 1], [1.0, 1.05]);

  // Pan direction: slide in from different sides
  if (currentShot.panDirection === 'down') {
    y = interpolate(shotProgress, [0, 0.3], [-8, 0]);
  } else if (currentShot.panDirection === 'left') {
    x = interpolate(shotProgress, [0, 0.3], [-8, 0]);
  } else if (currentShot.panDirection === 'right') {
    x = interpolate(shotProgress, [0, 0.3], [8, 0]);
  } else {
    // Center shot (final)
    x = 0;
    y = 0;
  }

  // Smooth transitions (LONGER fade times for smoothness)
  const fadeIn = interpolate(frame, [currentShot.startFrame - 20, currentShot.startFrame + 30], [0, 1]);
  const fadeOut = interpolate(frame, [currentShot.endFrame - 30, currentShot.endFrame + 20], [1, 0]);
  const shotOpacity = Math.min(fadeIn, fadeOut);

  // Text animations (staggered and SLOW)
  const titleOpacity = interpolate(frame, [currentShot.startFrame + 10, currentShot.startFrame + 40], [0, 1]);
  const subtitleOpacity = interpolate(frame, [currentShot.startFrame + 20, currentShot.startFrame + 50], [0, 1]);
  const descOpacity = interpolate(frame, [currentShot.startFrame + 30, currentShot.startFrame + 60], [0, 1]);
  const ctaOpacity = frame >= 1100 ? interpolate(frame, [1100, 1150], [0, 1]) : 0;

  // Scan line (very subtle, per-shot color)
  const scanLineY = (frame % 80) / 80 * 100;
  const scanLineOpacity = interpolate(shotProgress, [0, 0.9], [0.15, 0]);

  return (
    <Background>
      <ShotContainer>
        <MainImage
          src={staticFile(currentShot.file)}
          scale={scale}
          opacity={shotOpacity}
          x={x}
          y={y}
        />
        <ImageOverlay />

        {shotProgress < 0.9 && (
          <ScanLine
            y={scanLineY}
            opacity={scanLineOpacity}
            color={currentShot.color}
          />
        )}

        <TextContainer opacity={shotOpacity}>
          <ASCIITitle opacity={titleOpacity} color={currentShot.color}>
            <div style={{marginBottom: '4px'}}>+-----------------------+</div>
            <div>{currentShot.title}</div>
            <div style={{marginTop: '4px'}}>+-----------------------+</div>
          </ASCIITitle>

          <ASCTIISubtitle opacity={subtitleOpacity}>
            &gt; {currentShot.subtitle}
          </ASCTIISubtitle>

          <Description opacity={descOpacity}>{currentShot.desc}</Description>

          {currentShot.startFrame >= 1100 && (
            <CTAText opacity={ctaOpacity}>
              &gt;&gt;&gt; BUILD THE FUTURE &lt;&lt;&lt;
            </CTAText>
          )}
        </TextContainer>
      </ShotContainer>
    </Background>
  );
};
