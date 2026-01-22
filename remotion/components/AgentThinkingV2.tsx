import React from 'react';
import styled from 'styled-components';
import { interpolate, useCurrentFrame, spring } from 'remotion';
import { SESSION_EVENTS, EventType, getCurrentEvent } from '../session-events';

// ===== STYLED COMPONENTS =====

const ThinkingContainer = styled.div<{ scale: number; opacity: number }>`
  position: absolute;
  top: 150px;
  right: 120px;
  width: 320px;
  background: rgba(26, 31, 46, 0.98);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 136, 0.05);
  transform: scale(${props => props.scale});
  opacity: ${props => props.opacity};
`;

const ThinkingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
`;

const ThinkingIcon = styled.div<{ rotating: boolean }>`
  width: 32px;
  height: 32px;
  border: 3px solid #00ff88;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ${props => props.rotating ? 'spin 1s linear infinite' : 'none'};
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ThinkingLabel = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #00ff88;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const ThinkingProgress = styled.div`
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 18px;
`;

const ProgressBar = styled.div<{ width: number }>`
  height: 100%;
  background: linear-gradient(90deg, #00ff88 0%, #00d4ff 100%);
  width: ${props => props.width}%;
  border-radius: 3px;
`;

const ThinkingContent = styled.div`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 13px;
  color: #a0aec0;
  line-height: 1.7;
`;

const ThinkingText = styled.span<{ opacity: number }>`
  color: #e2e8f0;
  opacity: ${props => props.opacity};
`;

const ThinkingStep = styled.div<{ opacity: number; active: boolean }>`
  margin-bottom: 10px;
  padding: 8px 12px;
  background: ${props => props.active ? 'rgba(0, 255, 136, 0.1)' : 'transparent'};
  border-radius: 8px;
  border-left: ${props => props.active ? '3px solid #00ff88' : '3px solid transparent'};
  opacity: ${props => props.opacity};
  transition: all 0.3s ease;
`;

const StepLabel = styled.span<{ active: boolean }>`
  color: ${props => props.active ? '#00ff88' : '#718096'};
  font-weight: 600;
  margin-right: 8px;
`;

const StepText = styled.span<{ active: boolean }>`
  color: ${props => props.active ? '#e2e8f0' : '#718096'};
`;

// ===== MAIN COMPONENT =====

interface AgentThinkingV2Props {
  frame: number;
  startTime: number;
  endTime: number;
}

// Define the thinking steps that should appear during agent thinking
const THINKING_STEPS = [
  { label: '1', text: 'Analyzing sensor connectivity status...' },
  { label: '2', text: 'Cross-referencing network topology...' },
  { label: '3', text: 'Identifying failure point: relay node near pump house' },
  { label: '4', text: 'Calculating optimal resolution path...' },
  { label: '5', text: 'Preparing automated diagnostic commands...' },
];

export const AgentThinkingV2: React.FC<AgentThinkingV2Props> = ({
  frame,
  startTime,
  endTime,
}) => {
  const currentEvent = getCurrentEvent(frame);

  // Show only during agent thinking events
  const isThinking = currentEvent?.type === EventType.AGENT_THINKING;

  // Calculate thinking progress (0-100)
  const thinkingProgress = React.useMemo(() => {
    const thinkingEvents = SESSION_EVENTS.filter(e => e.type === EventType.AGENT_THINKING);
    const completedThinking = thinkingEvents.filter(e => e.frame < frame).length;
    return (completedThinking / thinkingEvents.length) * 100;
  }, [frame]);

  // Determine which step is active
  const activeStepIndex = React.useMemo(() => {
    const thinkingEvents = SESSION_EVENTS.filter(e => e.type === EventType.AGENT_THINKING);
    const currentThinking = thinkingEvents.findIndex(e => e.frame === currentEvent?.frame);
    return currentThinking >= 0 ? currentThinking : thinkingEvents.length;
  }, [frame, currentEvent]);

  // Fade in/out animations
  const opacity = interpolate(
    frame,
    [startTime, startTime + 30, endTime - 30, endTime],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // Scale animation (pop effect)
  const scale = spring({
    frame: frame - startTime,
    fps: 30,
    config: { stiffness: 100, damping: 15 },
  });

  // Only show during thinking, fade out otherwise
  const displayOpacity = isThinking ? 1 : 0;
  const displayScale = isThinking ? scale : 0.8;

  // Icon rotation
  const isRotating = Math.floor(frame / 15) % 2 === 0 && isThinking;

  if (displayOpacity <= 0.01) return null;

  return (
    <ThinkingContainer scale={displayScale} opacity={displayOpacity}>
      <ThinkingHeader>
        <ThinkingIcon rotating={isRotating} />
        <ThinkingLabel>Agent Thinking</ThinkingLabel>
      </ThinkingHeader>

      <ThinkingProgress>
        <ProgressBar width={thinkingProgress} />
      </ThinkingProgress>

      <ThinkingContent>
        {THINKING_STEPS.map((step, idx) => {
          const stepActive = idx === activeStepIndex;
          const stepOpacity = idx <= activeStepIndex ? 1 : 0.3;

          return (
            <ThinkingStep key={idx} opacity={stepOpacity} active={stepActive}>
              <StepLabel active={stepActive}>{step.label}</StepLabel>
              <StepText active={stepActive}>{step.text}</StepText>
            </ThinkingStep>
          );
        })}

        {currentEvent?.type === EventType.AGENT_THINKING && (
          <ThinkingText opacity={1}>
            🤖 {currentEvent.message}
          </ThinkingText>
        )}
      </ThinkingContent>
    </ThinkingContainer>
  );
};
