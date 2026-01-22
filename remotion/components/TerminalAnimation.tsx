import React from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

const TerminalWindow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1400px;
  height: 800px;
  background: #1a1f2e;
  border-radius: 12px;
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const TerminalHeader = styled.div`
  height: 50px;
  background: linear-gradient(90deg, #2d3548 0%, #1e2536 100%);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
`;

const WindowButton = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const TerminalBody = styled.div<{ scrollOffset: number }>`
  height: calc(100% - 50px);
  padding: 24px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 18px;
  line-height: 1.6;
  color: #a0aec0;
  overflow: hidden;
  position: relative;
`;

const ScrollContent = styled.div<{ translateY: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transform: translateY(${props => props.translateY}px);
  transition: transform 0.05s linear;
`;

const Prompt = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: #00ff88;
`;

const PromptSymbol = styled.span`
  margin-right: 12px;
  font-weight: bold;
`;

const Input = styled.span`
  color: #e2e8f0;
  animation: typing 1s steps(30, end);
`;

const Output = styled.div`
  margin-bottom: 20px;
  color: #00d4ff;
  line-height: 1.8;
`;

const SystemMessage = styled.div`
  margin-bottom: 16px;
  color: #ffd700;
  font-style: italic;
`;

const ToolCall = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 4px solid #00ff88;
  border-radius: 4px;
`;

const ToolName = styled.span`
  color: #ff6b6b;
  font-weight: bold;
  margin-right: 8px;
`;

const CODE_LINES = [
  { type: 'prompt', text: 'Analyze soil health across 500 acres' },
  { type: 'thinking', text: 'Processing sensor data and satellite imagery...' },
  { type: 'system', text: 'Provider: Claude 3.5 | Model: claude-3-5-sonnet' },
  { type: 'tool', text: 'tool_start: read', name: '📄 read' },
  { type: 'output', text: 'Loaded soil_sensor_data.json (45.2 MB)' },
  { type: 'tool', text: 'tool_start: web_search', name: '🔍 web_search' },
  { type: 'output', text: 'Found 3 relevant research papers on soil compaction' },
  { type: 'tool', text: 'tool_start: write', name: '✏️ write' },
  { type: 'output', text: 'Created soil_health_report.md' },
  { type: 'output', text: '✓ Analysis complete. 12 actionable insights generated.' },
];

export const TerminalAnimation: React.FC = () => {
  const frame = useCurrentFrame();

  // Auto-scroll effect
  const scrollOffset = interpolate(
    frame,
    [0, 60, 900],
    [0, 100, 600],
    { extrapolateRight: false }
  );

  // Typing animation for prompt
  const typingProgress = interpolate(
    frame,
    [60, 120, 180],
    [0, 0.5, 1],
    { extrapolateRight: false }
  );

  return (
    <TerminalWindow>
      <TerminalHeader>
        <WindowButton color="#ff5f56" />
        <WindowButton color="#ffbd2e" />
        <WindowButton color="#27c93f" />
      </TerminalHeader>
      <TerminalBody scrollOffset={scrollOffset}>
        <ScrollContent translateY={-scrollOffset * 0.8}>
          {CODE_LINES.map((line, idx) => {
            const lineStartFrame = 60 + (idx * 80);

            if (frame < lineStartFrame) return null;

            if (line.type === 'prompt') {
              return (
                <Prompt key={idx}>
                  <PromptSymbol>❯</PromptSymbol>
                  <Input>
                    {line.text.substring(0, Math.floor(line.text.length * typingProgress))}
                  </Input>
                </Prompt>
              );
            }

            if (line.type === 'thinking') {
              const opacity = interpolate(
                frame,
                [lineStartFrame, lineStartFrame + 20],
                [0, 1],
                { extrapolateRight: false }
              );
              return (
                <div key={idx} style={{ opacity, marginBottom: '12px', color: '#00d4ff' }}>
                  🤖 {line.text}
                </div>
              );
            }

            if (line.type === 'system') {
              return (
                <SystemMessage key={idx}>
                  {line.text}
                </SystemMessage>
              );
            }

            if (line.type === 'tool') {
              const scale = spring({
                frame: frame - lineStartFrame,
                fps: 30,
                config: { stiffness: 100, damping: 10 },
              });
              return (
                <ToolCall key={idx} style={{
                  opacity: Math.min(1, (frame - lineStartFrame) / 20),
                  transform: `scale(${Math.min(1, scale)})`
                }}>
                  <ToolName>{line.name}</ToolName>
                  {line.text}
                </ToolCall>
              );
            }

            if (line.type === 'output') {
              const opacity = interpolate(
                frame,
                [lineStartFrame, lineStartFrame + 30],
                [0, 1],
                { extrapolateRight: false }
              );
              return (
                <Output key={idx} style={{ opacity }}>
                  {line.text}
                </Output>
              );
            }

            return null;
          })}
        </ScrollContent>
      </TerminalBody>
    </TerminalWindow>
  );
};
