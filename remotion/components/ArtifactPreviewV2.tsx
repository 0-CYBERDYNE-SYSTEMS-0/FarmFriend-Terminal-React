import React from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import { SESSION_EVENTS, EventType, getCurrentEvent } from '../session-events';

// ===== STYLED COMPONENTS =====

const ArtifactCard = styled.div<{ scale: number; opacity: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(${props => props.scale});
  opacity: ${props => props.opacity};
  width: 780px;
  background: rgba(26, 31, 46, 0.99);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 18px;
  padding: 36px;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 255, 136, 0.05);
`;

const ArtifactHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
`;

const ArtifactIcon = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
`;

const ArtifactType = styled.div`
  flex: 1;
`;

const TypeName = styled.span`
  font-size: 12px;
  color: #00ff88;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
`;

const FileLabel = styled.span`
  display: block;
  font-size: 22px;
  font-weight: 800;
  color: #e2e8f0;
  margin-top: 6px;
`;

const ArtifactContent = styled.div`
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  max-height: 300px;
  overflow: hidden;
  border: 1px solid rgba(0, 212, 255, 0.1);
`;

const CodeBlock = styled.pre`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 14px;
  color: #00d4ff;
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  overflow-y: auto;
  max-height: 300px;
`;

const ArtifactFooter = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  background: rgba(0, 255, 136, 0.15);
  color: #00ff88;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const StatusIndicator = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusDot = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  animation: ${props => props.active ? 'pulse 2s ease-in-out infinite' : 'none'};
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
`;

// ===== MAIN COMPONENT =====

interface ArtifactPreviewV2Props {
  frame: number;
  startTime: number;
  endTime: number;
}

export const ArtifactPreviewV2: React.FC<ArtifactPreviewV2Props> = ({
  frame,
  startTime,
  endTime,
}) => {
  const currentEvent = getCurrentEvent(frame);

  // Show only during artifact created events
  const artifactEvent = currentEvent?.type === EventType.ARTIFACT_CREATED ? currentEvent : null;

  // Find the most recent artifact
  const activeArtifact = React.useMemo(() => {
    const artifactEvents = SESSION_EVENTS.filter(e => e.type === EventType.ARTIFACT_CREATED);
    return artifactEvents.filter(e => e.frame < frame).pop();
  }, [frame]);

  const artifact = activeArtifact?.artifact;

  // Fade in/out
  const opacity = interpolate(
    frame,
    [startTime, startTime + 30, endTime - 30, endTime],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // Only show when we have an artifact
  const displayOpacity = artifact ? 1 : 0;

  // Scale animation (pop in) - only calculate when artifact exists (use if, not ternary)
  let scale = 1;
  if (artifact) {
    scale = spring({
      frame: artifact.frame - startTime,
      fps: 30,
      config: { stiffness: 100, damping: 12 },
    });
  }

  if (displayOpacity <= 0.01 || !artifact) return null;

  return (
    <ArtifactCard scale={Math.min(1, scale)} opacity={displayOpacity}>
      <StatusIndicator>
        <StatusDot active={true} />
        CREATED
      </StatusIndicator>

      <ArtifactHeader>
        <ArtifactIcon>{artifact.icon}</ArtifactIcon>
        <ArtifactType>
          <TypeName>{artifact.type}</TypeName>
          <FileLabel>{artifact.file}</FileLabel>
        </ArtifactType>
      </ArtifactHeader>

      <ArtifactContent>
        <CodeBlock>{artifact.content}</CodeBlock>
      </ArtifactContent>

      <ArtifactFooter>
        {artifact.tags.map((tag, idx) => (
          <Tag key={idx}>{tag}</Tag>
        ))}
      </ArtifactFooter>
    </ArtifactCard>
  );
};
