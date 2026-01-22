import React from 'react';
import styled from 'styled-components';
import { interpolate, useCurrentFrame } from 'remotion';

const ThinkingContainer = styled.div`
  position: absolute;
  top: 180px;
  right: 100px;
  width: 280px;
  background: rgba(26, 31, 46, 0.95);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const ThinkingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
`;

const ThinkingIcon = styled.div<{ rotating: boolean }>`
  width: 24px;
  height: 24px;
  border: 3px solid #00ff88;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${props => props.rotating ? 'spin 1s linear infinite' : 'none'};
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ThinkingLabel = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #00ff88;
`;

const ThinkingProgress = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
`;

const ProgressBar = styled.div<{ width: number }>`
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00d4ff);
  transition: width 0.1s linear;
`;

const ThinkingText = styled.div`
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 12px;
  color: #a0aec0;
  margin-top: 12px;
  line-height: 1.6;
`;

interface AgentThinkingProps {
  frame: number;
  sceneStart: number;
  sceneEnd: number;
}

const THOUGHT_PROCESS = [
  "Analyzing soil sensor data...",
  "Cross-referencing weather patterns...",
  "Calculating optimal harvest time...",
  "Generating actionable insights...",
];

export const AgentThinking: React.FC<AgentThinkingProps> = ({
  frame,
  sceneStart,
  sceneEnd,
}) => {
  const sceneProgress = (frame - sceneStart) / (sceneEnd - sceneStart);
  const currentThought = Math.min(
    Math.floor(sceneProgress * THOUGHT_PROCESS.length),
    THOUGHT_PROCESS.length - 1
  );

  const opacity = interpolate(
    frame,
    [sceneStart, sceneStart + 30, sceneEnd - 30, sceneEnd],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  const progressWidth = interpolate(
    frame,
    [sceneStart, sceneEnd],
    [0, 100],
    { extrapolateRight: false }
  );

  const isThinking = Math.floor(frame / 30) % 2 === 0;

  if (opacity <= 0) return null;

  return (
    <ThinkingContainer style={{ opacity }}>
      <ThinkingHeader>
        <ThinkingIcon rotating={isThinking} />
        <ThinkingLabel>Agent Thinking</ThinkingLabel>
      </ThinkingHeader>

      <ThinkingProgress>
        <ProgressBar width={progressWidth} />
      </ThinkingProgress>

      <ThinkingText>
        {THOUGHT_PROCESS[currentThought]}
      </ThinkingText>
    </ThinkingContainer>
  );
};
