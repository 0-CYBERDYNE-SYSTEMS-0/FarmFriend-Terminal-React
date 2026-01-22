import React from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { SESSION_EVENTS, EventType, getCurrentEvent } from '../session-events';

// ===== STYLED COMPONENTS =====

const ToolCallPanel = styled.div<{ scale: number; opacity: number }>`
  position: absolute;
  bottom: 100px;
  left: 100px;
  background: rgba(26, 31, 46, 0.98);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 136, 0.05);
  width: 520px;
  transform: scale(${props => props.scale});
  opacity: ${props => props.opacity};
`;

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
`;

const ToolIcon = styled.div<{ icon: string }>`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 8px 20px rgba(0, 255, 136, 0.3);
`;

const ToolTitle = styled.h3`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
`;

const ToolDescription = styled.p`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  color: #a0aec0;
  line-height: 1.6;
  margin: 0 0 20px 0;
`;

const ToolDetails = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
`;

const DetailRow:last-child {
  margin-bottom: 0;
}

const DetailLabel = styled.span`
  color: #718096;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.span`
  color: #e2e8f0;
  font-family: 'SF Mono', 'Monaco', monospace;
  text-align: right;
`;

const ToolStats = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 24px;
`;

const Stat = styled.div`
  flex: 1;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.2);
  border-radius: 10px;
  padding: 16px;
`;

const StatLabel = styled.div`
  font-size: 11px;
  color: #00ff88;
  font-weight: 700;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 20px;
  color: #e2e8f0;
  font-weight: 700;
`;

const ToolCommandDisplay = styled.div`
  background: rgba(0, 212, 255, 0.1);
  border-left: 3px solid #00d4ff;
  padding: 12px 16px;
  margin-top: 16px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
  color: #00d4ff;
  word-break: break-all;
`;

// ===== MAIN COMPONENT =====

interface ToolCallV2Props {
  frame: number;
  startTime: number;
  endTime: number;
}

export const ToolCallV2: React.FC<ToolCallV2Props> = ({
  frame,
  startTime,
  endTime,
}) => {
  const currentEvent = getCurrentEvent(frame);

  // Show only during tool call events
  const toolEvent = currentEvent?.type === EventType.TOOL_CALL ? currentEvent : null;

  // Find the most recent tool call that started before current frame
  const activeToolCall = React.useMemo(() => {
    const toolCalls = SESSION_EVENTS.filter(e => e.type === EventType.TOOL_CALL);
    const recentCall = toolCalls.filter(e => e.frame < frame).pop();
    return recentCall || null;
  }, [frame]);

  const tool = activeToolCall?.tool;

  // Fade in/out
  const opacity = interpolate(
    frame,
    [startTime, startTime + 30, endTime - 30, endTime],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // Only show when we have a tool call, fade out otherwise
  const displayOpacity = tool ? 1 : 0;

  // Scale animation
  const scale = spring({
    frame: tool ? tool.frame - startTime : 0,
    fps: 30,
    config: { stiffness: 100, damping: 15 },
  });

  // Horizontal slide animation
  const translateX = interpolate(
    frame,
    [startTime, startTime + 20],
    [50, 0],
    { extrapolateRight: false }
  );

  if (displayOpacity <= 0.01 || !tool) return null;

  return (
    <ToolCallPanel
      scale={Math.min(1, scale)}
      opacity={displayOpacity}
      style={{ transform: `translate(${translateX}px, 0)` }}
    >
      <ToolHeader>
        <ToolIcon icon={tool.icon}>{tool.icon}</ToolIcon>
        <ToolTitle>{tool.name}</ToolTitle>
      </ToolHeader>

      <ToolDescription>{tool.description}</ToolDescription>

      {tool.command && (
        <ToolDetails>
          <DetailRow>
            <DetailLabel>Command</DetailLabel>
            <DetailValue>{tool.command}</DetailValue>
          </DetailRow>
        </ToolDetails>
      )}

      {tool.path && (
        <ToolDetails>
          <DetailRow>
            <DetailLabel>Path</DetailLabel>
            <DetailValue>{tool.path}</DetailValue>
          </DetailRow>
        </ToolDetails>
      )}

      {tool.command && (
        <ToolCommandDisplay>
          $ {tool.command}
        </ToolCommandDisplay>
      )}

      <ToolStats>
        <Stat>
          <StatLabel>Duration</StatLabel>
          <StatValue>{tool.duration}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Size</StatLabel>
          <StatValue>{tool.size}</StatValue>
        </Stat>
      </ToolStats>
    </ToolCallPanel>
  );
};
