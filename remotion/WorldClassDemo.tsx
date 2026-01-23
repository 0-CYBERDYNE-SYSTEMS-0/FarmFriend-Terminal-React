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
    color: '#00ff88',
    bgColor: 'linear-gradient(135deg, #001a0a 0%, #002d1b 100%)',
    accent: 'rgba(0, 255, 136, 0.3)',
    camera: 'slow-zoom-in',
  },
  {
    file: 'Screenshot 2025-10-03 at 12.39.40.png',
    title: 'EVOLVING INTELLIGENCE',
    subtitle: 'October 2025',
    desc: 'Adding natural language understanding',
    startFrame: 100,
    endFrame: 200,
    color: '#00d4ff',
    bgColor: 'linear-gradient(135deg, #001a2a 0%, #002d3d 100%)',
    accent: 'rgba(0, 212, 255, 0.3)',
    camera: 'pan-right',
  },
  {
    file: 'Screenshot 2025-10-21 at 23.29.51.png',
    title: 'CODE GENERATION',
    subtitle: 'October 2025',
    desc: 'The system learns to write its own code',
    startFrame: 200,
    endFrame: 300,
    color: '#ffd700',
    bgColor: 'linear-gradient(135deg, #001a1a 0%, #003322 100%)',
    accent: 'rgba(255, 215, 0, 0.3)',
    camera: 'pan-left',
  },
  {
    file: 'Screenshot 2025-11-01 at 12.00.03.png',
    title: 'MULTI-PROCESS ARCHITECTURE',
    subtitle: 'November 2025',
    desc: 'Separating AI from UI for performance',
    startFrame: 300,
    endFrame: 400,
    color: '#ff6b6b',
    bgColor: 'linear-gradient(135deg, #1a001a 0%, #2d002d 100%)',
    accent: 'rgba(255, 107, 107, 0.3)',
    camera: 'push-zoom',
  },
  {
    file: 'Screenshot 2025-11-07 at 20.15.37.png',
    title: 'TOOL ECOSYSTEM BORN',
    subtitle: 'November 2025',
    desc: 'The first tools connect to the world',
    startFrame: 400,
    endFrame: 500,
    color: '#a855f7',
    bgColor: 'linear-gradient(135deg, #0a001a 0%, #1a0a1a 100%)',
    accent: 'rgba(168, 85, 247, 0.3)',
    camera: 'reveal',
  },
  {
    file: 'Screenshot 2025-11-28 at 13.42.04.png',
    title: 'SKILL SYSTEM EMERGES',
    subtitle: 'November 2025',
    desc: 'Modular skills for any industry',
    startFrame: 500,
    endFrame: 600,
    color: '#e94560',
    bgColor: 'linear-gradient(135deg, #00201a 0%, #003a1a 100%)',
    accent: 'rgba(233, 69, 96, 0.3)',
    camera: 'zoom-out',
  },
  {
    file: 'Screenshot 2025-12-04 at 16.29.20.png',
    title: 'REAL-WORLD DEPLOYMENT',
    subtitle: 'December 2025',
    desc: 'Running on actual farms. Real data.',
    startFrame: 600,
    endFrame: 700,
    color: '#ff4757',
    bgColor: 'linear-gradient(135deg, #0a0020 0%, #1a2a0a 100%)',
    accent: 'rgba(255, 71, 87, 0.3)',
    camera: 'rotate-zoom',
  },
  {
    file: 'Screenshot 2025-12-06 at 01.07.47.png',
    title: 'MACHINE LEARNING INTEGRATION',
    subtitle: 'December 2025',
    desc: 'Learning from every interaction',
    startFrame: 700,
    endFrame: 800,
    color: '#00b4d8',
    bgColor: 'linear-gradient(135deg, #001a0f 0%, #002d22 100%)',
    accent: 'rgba(0, 180, 216, 0.3)',
    camera: 'split-screen',
  },
  {
    file: 'Screenshot 2025-12-29 at 14.04.38.png',
    title: 'CROSS-DOMAIN AWARENESS',
    subtitle: 'December 2025',
    desc: 'One system. Any industry. Any task.',
    startFrame: 800,
    endFrame: 900,
    color: '#00d9ff',
    bgColor: 'linear-gradient(135deg, #0a0018 0%, #001a2a 100%)',
    accent: 'rgba(0, 217, 255, 0.3)',
    camera: 'iris-wipe',
  },
  {
    file: 'Screenshot 2025-12-31 at 00.55.14.png',
    title: 'NEW YEAR BREAKTHROUGH',
    subtitle: 'January 1, 2026',
    desc: 'The foundation is solid. Scaling begins.',
    startFrame: 900,
    endFrame: 1000,
    color: '#00ff88',
    bgColor: 'linear-gradient(135deg, #001a0a 0%, #002d1b 100%)',
    accent: 'rgba(0, 255, 136, 0.3)',
    camera: 'glitch-transition',
  },
  {
    file: 'Screenshot 2026-01-01 at 14.14.02.png',
    title: 'INVISIBLE ASSISTANT CONCEPT',
    subtitle: 'January 2026',
    desc: 'AI that works in the background. Always.',
    startFrame: 1000,
    endFrame: 1100,
    color: '#00ff88',
    bgColor: 'linear-gradient(135deg, #0a0a10 0%, #1a001a 100%)',
    accent: 'rgba(0, 255, 136, 0.3)',
    camera: 'parallax',
  },
  {
    file: 'Screenshot 2026-01-22 at 08.28.46.png',
    title: 'THIS IS FARM FRIEND TERMINAL',
    subtitle: 'The Future Is Here',
    desc: 'Autonomous AI. Production-Grade. Ready.',
    startFrame: 1100,
    endFrame: 1200,
    color: '#00ff88',
    bgColor: 'linear-gradient(135deg, #000a00 0%, #001a00 100%)',
    accent: 'rgba(0, 255, 136, 0.5)',
    camera: 'final-reveal',
  },
];

// ===== STYLED COMPONENTS =====

const Background = styled(AbsoluteFill)<{ bgGradient: string }>`
  background: ${props => props.bgGradient};
`;

const ShotContainer = styled(AbsoluteFill)`
  overflow: hidden;
`;

const MainImage = styled.img<{
  scale: number;
  opacity: number;
  x: number;
  y: number;
  rotate: number;
}>`
  position: absolute;
  width: 105%;
  height: 105%;
  left: -2.5%;
  top: -2.5%;
  object-fit: cover;
  transform: translate(${props => props.x}%, ${props => props.y}%) scale(${props => props.scale}) rotate(${props => props.rotate}deg);
  opacity: ${props => props.opacity};
`;

const ImageOverlay = styled(AbsoluteFill)<{ accentColor: string }>`
  background: radial-gradient(circle at 50% 50%, transparent 40%, ${props => props.accentColor || 'rgba(0, 0, 0, 0.6)'} 100%);
`;

const BorderGlow = styled.div<{ color: string; opacity: number }>`
  position: absolute;
  left: 40px;
  right: 40px;
  top: 40px;
  bottom: 40px;
  border: 2px solid ${props => props.color};
  box-shadow: 0 0 30px ${props => props.color}, inset 0 0 20px ${props => props.color};
  opacity: ${props => props.opacity};
  pointer-events: none;
`;

const CornerAccent = styled.div<{ color: string }>`
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid ${props => props.color};
  ${props => props.color === '#00ff88' ? 'top: 10px; right: 10px;' : ''}
  ${props => props.color === '#ffd700' ? 'top: 10px; left: 10px;' : ''}
  ${props => props.color === '#ff6b6b' ? 'bottom: 10px; left: 10px;' : ''}
  ${props => props.color === '#a855f7' ? 'bottom: 10px; right: 10px;' : ''}
`;

const TextContainer = styled.div<{ opacity: number }>`
  position: absolute;
  bottom: 100px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  opacity: ${props => props.opacity};
`;

const Badge = styled.div<{ color: string }>`
  display: inline-block;
  background: ${props => props.color};
  color: #000000;
  padding: 8px 20px;
  border-radius: 20px;
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px ${props => props.color};
`;

const MainTitle = styled.h1<{ opacity: number }>`
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 68px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.1;
  margin: 0 0 12px 0;
  letter-spacing: -2px;
  text-shadow: 0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px ${props => props.color};
  opacity: ${props => props.opacity};
`;

const Subtitle = styled.p<{ opacity: number }>`
  font-family: 'SF Pro Text', -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.color};
  margin: 0 0 24px 0;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: ${props => props.opacity};
`;

const Description = styled.p<{ opacity: number }>`
  font-family: 'SF Pro Text', -apple-system, sans-serif;
  font-size: 24px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  letter-spacing: -0.3px;
  opacity: ${props => props.opacity};
  line-height: 1.5;
`;

const CTAText = styled.div<{ opacity: number }>`
  font-family: 'SF Pro Display', -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 800;
  color: #00ff88;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: rgba(0, 255, 136, 0.2);
  border: 3px solid #00ff88;
  padding: 16px 48px;
  border-radius: 32px;
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
  opacity: ${props => props.opacity};
`;

const TechLine = styled.div<{ color: string; width: number; opacity: number }>`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: ${props => props.color};
  top: 50%;
  transform: translateY(-50%);
  opacity: ${props => props.opacity};
  box-shadow: 0 0 10px ${props => props.color};
`;

// Camera technique implementations
const CameraEffectWrapper = styled.div<{
  scale: number;
  x: number;
  y: number;
  rotate: number;
  clipPath?: string;
}>`
  position: absolute;
  width: 105%;
  height: 105%;
  left: -2.5%;
  top: -2.5%;
  ${props => props.clipPath ? `clip-path: ${props.clipPath};` : ''}
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

  // ===== PREMIUM CAMERA TECHNIQUES =====

  let x = 0;
  let y = 0;
  let scale = 1.0;
  let rotate = 0;
  let clipPath = '';

  // Apply different camera technique per shot
  switch (currentShot.camera) {
    case 'slow-zoom-in':
      scale = interpolate(shotProgress, [0, 1], [1.0, 1.08]);
      break;
    case 'pan-right':
      x = interpolate(shotProgress, [0, 0.3], [-5, 0]);
      break;
    case 'pan-left':
      x = interpolate(shotProgress, [0, 0.3], [5, 0]);
      break;
    case 'push-zoom':
      scale = interpolate(shotProgress, [0, 0.5, 1], [1.0, 1.1]);
      rotate = interpolate(shotProgress, [0, 1], [0, -2]);
      break;
    case 'reveal':
      scale = interpolate(shotProgress, [0, 0.4], [1.15, 1.0]);
      break;
    case 'zoom-out':
      scale = interpolate(shotProgress, [0, 1], [1.1, 1.0]);
      break;
    case 'rotate-zoom':
      scale = interpolate(shotProgress, [0, 1], [1.05, 1.0]);
      rotate = interpolate(shotProgress, [0, 1], [2, 0]);
      break;
    case 'split-screen':
      clipPath = 'inset(50% 0 50% 0)';
      scale = interpolate(shotProgress, [0, 1], [1.2, 1.0]);
      break;
    case 'iris-wipe':
      const irisSize = interpolate(shotProgress, [0, 0.8, 1], [120, 50, 0]);
      clipPath = `circle(${irisSize}% at 50% 50%)`;
      break;
    case 'glitch-transition':
      x = Math.sin(shotProgress * Math.PI * 4) * 5;
      rotate = Math.cos(shotProgress * Math.PI * 3) * 2;
      break;
    case 'parallax':
      y = interpolate(shotProgress, [0, 1], [-5, 0]);
      scale = interpolate(shotProgress, [0, 1], [1.05, 1.02]);
      break;
    case 'final-reveal':
      scale = interpolate(shotProgress, [0, 1], [1.0, 1.15]);
      break;
    default:
      scale = 1.0;
      break;
  }

  // Smooth transitions (professional)
  const fadeIn = interpolate(frame, [currentShot.startFrame - 15, currentShot.startFrame + 20], [0, 1]);
  const fadeOut = interpolate(frame, [currentShot.endFrame - 20, currentShot.endFrame + 20], [1, 0]);
  const shotOpacity = Math.min(fadeIn, fadeOut);

  // Text animations (staggered, professional)
  const badgeOpacity = interpolate(frame, [currentShot.startFrame, currentShot.startFrame + 30], [0, 1]);
  const titleOpacity = interpolate(frame, [currentShot.startFrame + 10, currentShot.startFrame + 45], [0, 1]);
  const subtitleOpacity = interpolate(frame, [currentShot.startFrame + 20, currentShot.startFrame + 55], [0, 1]);
  const descOpacity = interpolate(frame, [currentShot.startFrame + 30, currentShot.startFrame + 65], [0, 1]);
  const ctaOpacity = frame >= 1120 ? interpolate(frame, [1120, 1170], [0, 1]) : 0;

  // Tech line animation
  const techLineWidth = interpolate(shotProgress, [0, 1], [0, 100]);
  const techLineOpacity = interpolate(shotProgress, [0, 0.7], [0, 1]);

  return (
    <Background bgGradient={currentShot.bgColor}>
      <ShotContainer>
        <CameraEffectWrapper
          scale={scale}
          x={x}
          y={y}
          rotate={rotate}
          clipPath={clipPath}
        >
          <MainImage
            src={staticFile(currentShot.file)}
            scale={1}
            opacity={1}
            x={0}
            y={0}
            rotate={0}
          />
        </CameraEffectWrapper>
        <ImageOverlay accentColor={currentShot.accent} />

        <BorderGlow color={currentShot.color} opacity={shotOpacity} />
        <TechLine color={currentShot.color} width={techLineWidth} opacity={techLineOpacity} />

        {shotProgress < 0.95 && currentShot.color === '#00ff88' && (
          <CornerAccent color={currentShot.color} />
        )}
        {shotProgress < 0.95 && currentShot.color === '#ffd700' && (
          <CornerAccent color={currentShot.color} />
        )}
        {shotProgress < 0.95 && currentShot.color === '#ff6b6b' && (
          <CornerAccent color={currentShot.color} />
        )}
        {shotProgress < 0.95 && currentShot.color === '#a855f7' && (
          <CornerAccent color={currentShot.color} />
        )}
      </ShotContainer>

      <TextContainer opacity={shotOpacity}>
        <Badge color={currentShot.color} opacity={badgeOpacity}>
          {currentShot.subtitle}
        </Badge>

        <MainTitle opacity={titleOpacity}>{currentShot.title}</MainTitle>

        <Subtitle opacity={subtitleOpacity}>{currentShot.desc}</Subtitle>

        {currentShot.startFrame >= 1100 && (
          <CTAText opacity={ctaOpacity}>
            BUILD THE FUTURE WITH FF TERMINAL
          </CTAText>
        )}
      </TextContainer>
    </Background>
  );
};
