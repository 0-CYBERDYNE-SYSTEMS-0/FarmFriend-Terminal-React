import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import styled from 'styled-components';
import { TerminalAnimationV2 } from './components/TerminalAnimationV2';
import { AgentThinkingV2 } from './components/AgentThinkingV2';
import { ToolCallV2 } from './components/ToolCallV2';
import { ArtifactPreviewV2 } from './components/ArtifactPreviewV2';
import { SESSION_EVENTS } from './session-events';

// ===== STYLED COMPONENTS =====

const Background = styled(AbsoluteFill)`
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f2e 100%);
  position: relative;
`;

const GridOverlay = styled(AbsoluteFill)`
  background-image:
    linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.5;
`;

const TitleContainer = styled.div<{ opacity: number }>`
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  opacity: ${props => props.opacity};
`;

const Title = styled.h1`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 80px;
  font-weight: 900;
  color: #00ff88;
  text-shadow: 0 0 30px rgba(0, 255, 136, 0.6), 0 0 60px rgba(0, 255, 136, 0.3);
  margin: 0;
  letter-spacing: -2px;
`;

const Subtitle = styled.p<{ opacity: number }>`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 24px;
  color: #888;
  margin-top: 24px;
  text-align: center;
  opacity: ${props => props.opacity};
  font-weight: 300;
`;

const CTAContainer = styled.div<{ opacity: number }>`
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  opacity: ${props => props.opacity};
  z-index: 10;
`;

const CTATitle = styled.h2`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 36px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0 0 16px 0;
`;

const CTASubtitle = styled.p`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  color: #a0aec0;
  margin: 0 0 24px 0;
`;

const CTAButton = styled.div`
  display: inline-block;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  color: #0a0e27;
  padding: 16px 40px;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 10px 40px rgba(0, 255, 136, 0.4);
  cursor: pointer;
  transition: transform 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

// ===== TIMING CONFIGURATION =====

// Total video duration: 60 seconds (1800 frames @ 30fps)
const TOTAL_FRAMES = 1800;

// Scene timings
const TITLE_START = 0;
const TITLE_END = 120; // 4 seconds

const SESSION_START = 120;
const SESSION_END = 1440; // 48 seconds

const CTA_START = 1440;
const CTA_END = 1800; // 12 seconds

// ===== MAIN COMPONENT =====

export const FFDemoV2: React.FC = () => {
  const frame = useCurrentFrame();

  // Title animations
  const titleOpacity = interpolate(
    frame,
    [TITLE_START, TITLE_START + 30, TITLE_END - 30, TITLE_END],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  const subtitleOpacity = interpolate(
    frame,
    [TITLE_START + 15, TITLE_START + 45, TITLE_END - 30, TITLE_END],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // Terminal animation (visible during session)
  const terminalOpacity = interpolate(
    frame,
    [TITLE_END, TITLE_END + 30, SESSION_END - 30, SESSION_END],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // CTA animations
  const ctaOpacity = interpolate(
    frame,
    [CTA_START, CTA_START + 30, CTA_END - 30, CTA_END],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  return (
    <Background>
      <GridOverlay />

      {/* ===== TITLE SCENE (0-4s) ===== */}
      <TitleContainer style={{ opacity: titleOpacity }}>
        <Title>FF Terminal</Title>
      </TitleContainer>

      <TitleContainer style={{ opacity: subtitleOpacity, top: '180px' }}>
        <Subtitle>AI-Powered Autonomous Development Environment</Subtitle>
      </TitleContainer>

      {/* ===== TERMINAL SCENE (4-48s) ===== */}
      <div style={{ opacity: terminalOpacity }}>
        <TerminalAnimationV2
          frame={frame}
          startTime={SESSION_START}
          endTime={SESSION_END}
        />

        <div style={{ opacity: terminalOpacity }}>
          <AgentThinkingV2
            frame={frame}
            startTime={SESSION_START}
            endTime={SESSION_END}
          />
        </div>

        <div style={{ opacity: terminalOpacity }}>
          <ToolCallV2
            frame={frame}
            startTime={SESSION_START}
            endTime={SESSION_END}
          />
        </div>

        <div style={{ opacity: terminalOpacity }}>
          <ArtifactPreviewV2
            frame={frame}
            startTime={SESSION_START}
            endTime={SESSION_END}
          />
        </div>
      </div>

      {/* ===== CTA SCENE (48-60s) ===== */}
      <CTAContainer style={{ opacity: ctaOpacity }}>
        <CTATitle>Build Your Own Invisible Assistant</CTATitle>
        <CTASubtitle>Terminal-powered AI automation for any industry</CTASubtitle>
        <CTAButton>Get Started</CTAButton>
      </CTAContainer>

      {/* Background audio - to be added separately */}
    </Background>
  );
};
