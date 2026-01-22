import React from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

const ToolCallPanel = styled.div`
  position: absolute;
  bottom: 100px;
  left: 100px;
  background: rgba(26, 31, 46, 0.95);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  width: 500px;
`;

const ToolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const ToolIcon = styled.div<{ icon: string }>`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const ToolTitle = styled.h3`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
`;

const ToolDescription = styled.p`
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  color: #a0aec0;
  line-height: 1.6;
  margin: 0 0 16px 0;
`;

const ToolStats = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
`;

const Stat = styled.div`
  flex: 1;
  background: rgba(0, 255, 136, 0.1);
  padding: 12px;
  border-radius: 8px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #00ff88;
  font-weight: 600;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 18px;
  color: #e2e8f0;
`;

interface ToolCallProps {
  frame: number;
  sceneStart: number;
  sceneEnd: number;
}

const TOOLS = [
  { icon: '📄', name: 'read', desc: 'Reading soil_sensor_data.json (45.2 MB)', duration: '0.8s', size: '45.2 MB' },
  { icon: '🔍', name: 'web_search', desc: 'Searching for soil compaction research papers', duration: '1.2s', size: 'N/A' },
  { icon: '✏️', name: 'write', desc: 'Creating soil_health_report.md with insights', duration: '0.6s', size: '12 KB' },
  { icon: '🔨', name: 'exec', desc: 'Running soil analysis pipeline', duration: '3.4s', size: 'N/A' },
  { icon: '🖼️', name: 'image', desc: 'Generating soil heat map visualization', duration: '2.1s', size: '2.3 MB' },
  { icon: '📊', name: 'code', desc: 'Analyzing crop yield predictions', duration: '1.8s', size: 'N/A' },
];

export const ToolCall: React.FC<ToolCallProps> = ({
  frame,
  sceneStart,
  sceneEnd,
}) => {
  const sceneProgress = (frame - sceneStart) / (sceneEnd - sceneStart);
  const toolIndex = Math.min(
    Math.floor(sceneProgress * TOOLS.length),
    TOOLS.length - 1
  );

  const scale = spring({
    frame: frame - sceneStart - (toolIndex * 80),
    fps: 30,
    config: { stiffness: 100, damping: 10 },
  });

  const opacity = interpolate(
    frame,
    [sceneStart, sceneStart + 30, sceneEnd - 30, sceneEnd],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  const tool = TOOLS[toolIndex];

  if (opacity <= 0) return null;

  return (
    <ToolCallPanel style={{
      opacity,
      transform: `scale(${Math.min(1, scale)}) translateX(${interpolate(
        frame,
        [sceneStart, sceneEnd],
        [0, -20],
        { extrapolateRight: false }
      )}%)`
    }}>
      <ToolHeader>
        <ToolIcon icon={tool.icon}>{tool.icon}</ToolIcon>
        <ToolTitle>{tool.name}</ToolTitle>
      </ToolHeader>

      <ToolDescription>{tool.desc}</ToolDescription>

      <ToolStats>
        <Stat>
          <StatLabel>DURATION</StatLabel>
          <StatValue>{tool.duration}</StatValue>
        </Stat>
        <Stat>
          <StatLabel>SIZE</StatLabel>
          <StatValue>{tool.size}</StatValue>
        </Stat>
      </ToolStats>
    </ToolCallPanel>
  );
};
