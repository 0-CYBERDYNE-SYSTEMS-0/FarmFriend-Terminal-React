import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Audio } from 'remotion';
import styled from 'styled-components';
import { TerminalAnimation } from './components/TerminalAnimation';
import { AgentThinking } from './components/AgentThinking';
import { ToolCall } from './components/ToolCall';
import { ArtifactPreview } from './components/ArtifactPreview';

const Background = styled(AbsoluteFill)`
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f2e 100%);
`;

const TitleContainer = styled.div`
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
`;

const Title = styled.h1`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 72px;
  font-weight: 800;
  color: #00ff88;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  margin: 0;
`;

const Subtitle = styled.p`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 24px;
  color: #888;
  margin-top: 20px;
  text-align: center;
`;

export const FFTerminalDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Timeline for 30 seconds (900 frames @ 30fps)
  const titleOpacity = interpolate(
    frame,
    [0, 30, 60],
    [0, 1, 0],
    { extrapolateRight: false }
  );

  const terminalOpacity = interpolate(
    frame,
    [0, 60, 180, 750, 780, 840],
    [0, 1, 1, 1, 0, 0],
    { extrapolateRight: false }
  );

  const thinkingOpacity = interpolate(
    frame,
    [0, 120, 180, 300, 360, 420, 720, 780],
    [0, 0, 1, 1, 0, 0, 1, 0],
    { extrapolateRight: false }
  );

  const toolCallOpacity = interpolate(
    frame,
    [0, 240, 300, 360, 420, 480, 720, 780],
    [0, 0, 1, 1, 0, 0, 1, 0],
    { extrapolateRight: false }
  );

  const artifactOpacity = interpolate(
    frame,
    [0, 480, 540, 660, 720, 780, 810, 900],
    [0, 0, 1, 1, 0, 0, 1, 0],
    { extrapolateRight: false }
  );

  // Scene timing breakdown:
  // 0-2s (0-60): Title fade in/out, terminal appears
  // 2-10s (60-300): Agent thinking + tool calls cycle
  // 10-24s (300-720): Multiple tool calls and artifacts
  // 24-28s (720-840): Terminal interaction
  // 28-30s (840-900): Final artifact + call to action

  return (
    <Background>
      {/* Title Animation (0-2s) */}
      <TitleContainer style={{ opacity: titleOpacity }}>
        <Title>FF Terminal</Title>
        <Subtitle>AI-Powered Farming Intelligence</Subtitle>
      </TitleContainer>

      {/* Terminal Animation (2-28s) */}
      <div style={{ opacity: terminalOpacity }}>
        <TerminalAnimation />
      </div>

      {/* Agent Thinking Indicators */}
      <div style={{ opacity: thinkingOpacity }}>
        <AgentThinking
          frame={frame}
          sceneStart={180}
          sceneEnd={360}
        />
      </div>

      {/* Tool Call Animations */}
      <div style={{ opacity: toolCallOpacity }}>
        <ToolCall
          frame={frame}
          sceneStart={300}
          sceneEnd={720}
        />
      </div>

      {/* Artifact Previews */}
      <div style={{ opacity: artifactOpacity }}>
        <ArtifactPreview
          frame={frame}
          sceneStart={540}
          sceneEnd={900}
        />
      </div>

      {/* Background audio - will be added separately */}
      <Audio />
    </Background>
  );
};
