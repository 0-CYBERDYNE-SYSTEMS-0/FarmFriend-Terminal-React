import React, { useMemo } from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';
import {
  SESSION_EVENTS,
  getCurrentEvent,
  TERMINAL_COLORS,
  EventType,
} from '../session-events';

// ===== STYLED COMPONENTS =====

const TerminalWindow = styled.div<{ opacity: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1600px;
  height: 900px;
  background: #1a1f2e;
  border-radius: 16px;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 255, 136, 0.1);
  overflow: hidden;
  opacity: ${props => props.opacity};
`;

const TerminalHeader = styled.div`
  height: 60px;
  background: linear-gradient(90deg, #2d3548 0%, #1e2536 100%);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  border-bottom: 1px solid rgba(0, 255, 136, 0.1);
`;

const WindowButton = styled.div<{ color: string }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const TerminalTitle = styled.div`
  flex: 1;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #718096;
  letter-spacing: 0.5px;
`;

const TerminalBody = styled.div<{ scrollOffset: number }>`
  height: calc(100% - 60px);
  padding: 32px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Menlo', monospace;
  font-size: 16px;
  line-height: 1.7;
  color: #a0aec0;
  overflow: hidden;
  position: relative;
  background: radial-gradient(circle at top right, rgba(0, 255, 136, 0.03) 0%, transparent 60%);
`;

const ScrollContent = styled.div<{ translateY: number }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transform: translateY(${props => props.translateY}px);
`;

const Prompt = styled.div<{ opacity: number }>`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  color: ${TERMINAL_COLORS.PROMPT};
  opacity: ${props => props.opacity};
`;

const PromptSymbol = styled.span`
  margin-right: 16px;
  font-weight: 700;
`;

const UserInput = styled.span<{ chars: number; maxChars: number }>`
  color: ${TERMINAL_COLORS.USER_INPUT};
  cursor: ${props => (props.chars < props.maxChars ? 'block' : 'default')};
`;

const Cursor = styled.span<{ visible: boolean }>`
  display: inline-block;
  width: 10px;
  height: 22px;
  background: ${TERMINAL_COLORS.PROMPT};
  margin-left: 4px;
  animation: ${props => (props.visible ? 'blink 1s step-end infinite' : 'none')};
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;

const AgentResponse = styled.div<{ opacity: number }>`
  margin-bottom: 20px;
  opacity: ${props => props.opacity};
`;

const ResponseText = styled.span<{ opacity: number }>`
  color: ${TERMINAL_COLORS.AGENT_RESPONSE};
  opacity: ${props => props.opacity};
`;

const ToolCommand = styled.div<{ opacity: number }>`
  color: ${TERMINAL_COLORS.TOOL_CALL};
  font-weight: 600;
  margin-bottom: 8px;
  opacity: ${props => props.opacity};
`;

const OutputLine = styled.div<{ opacity: number; color?: string }>`
  margin-bottom: 4px;
  opacity: ${props => props.opacity};
  color: ${props => props.color || TERMINAL_COLORS.TOOL_OUTPUT};
`;

const SystemMessage = styled.div<{ opacity: number }>`
  color: ${TERMINAL_COLORS.SYSTEM};
  font-style: italic;
  margin-bottom: 12px;
  opacity: ${props => props.opacity};
`;

const SuccessMessage = styled.div<{ opacity: number }>`
  color: ${TERMINAL_COLORS.SUCCESS};
  font-weight: 700;
  margin-bottom: 16px;
  opacity: ${props => props.opacity};
`;

const ErrorMessage = styled.div<{ opacity: number }>`
  color: ${TERMINAL_COLORS.ERROR};
  font-weight: 600;
  margin-bottom: 12px;
  opacity: ${props => props.opacity};
`;

// ===== MAIN COMPONENT =====

interface TerminalAnimationV2Props {
  frame: number;
  startTime: number;
  endTime: number;
}

export const TerminalAnimationV2: React.FC<TerminalAnimationV2Props> = ({
  frame,
  startTime,
  endTime,
}) => {
  const currentEvent = useMemo(() => getCurrentEvent(frame), [frame]);

  // Overall fade in/out
  const opacity = interpolate(
    frame,
    [startTime, startTime + 30, endTime - 30, endTime],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  // Blink cursor every 30 frames (1 second)
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  // Scroll offset calculation
  const scrollOffset = useMemo(() => {
    const completedEvents = SESSION_EVENTS.filter((e) => e.frame < frame).length;
    return completedEvents * 80; // 80px per event approx
  }, [frame]);

  // Calculate user input typing progress
  const userPromptEvent = SESSION_EVENTS.find((e) => e.type === EventType.USER_PROMPT);
  const typingProgress = useMemo(() => {
    if (!userPromptEvent) return { chars: 0, maxChars: 0 };
    const eventDuration = userPromptEvent.duration || 120;
    const elapsed = frame - userPromptEvent.frame;
    const progress = Math.min(1, Math.max(0, elapsed / eventDuration));
    const maxChars = userPromptEvent.text?.length || 0;
    return {
      chars: Math.floor(progress * maxChars),
      maxChars,
    };
  }, [frame, userPromptEvent]);

  // Render terminal content
  const renderContent = () => {
    const lines: JSX.Element[] = [];
    let lineIndex = 0;

    for (const event of SESSION_EVENTS) {
      if (event.frame > frame + 50) break; // Render upcoming events slightly early

      const eventOpacity = interpolate(
        frame,
        [event.frame - 10, event.frame + 15],
        [0, 1],
        { extrapolateRight: false }
      );

      switch (event.type) {
        case EventType.USER_PROMPT: {
          const typedText = (event.text || '').substring(0, typingProgress.chars);
          const eventEnd = event.duration ? event.frame + event.duration : frame + 1;
          const shouldShowCursor = cursorVisible && frame < eventEnd;

          lines.push(
            <Prompt key={`prompt-${lineIndex++}`} opacity={eventOpacity}>
              <PromptSymbol>farmfriend{'>'}</PromptSymbol>
              <UserInput chars={typingProgress.chars} maxChars={typingProgress.maxChars}>
                {typedText}
              </UserInput>
              {shouldShowCursor && <Cursor visible={cursorVisible} />}
            </Prompt>
          );
          break;
        }

        case EventType.AGENT_THINKING:
          lines.push(
            <AgentResponse key={`thinking-${lineIndex++}`} opacity={eventOpacity}>
              <ResponseText opacity={eventOpacity}>
                🤖 {event.message}
              </ResponseText>
            </AgentResponse>
          );
          break;

        case EventType.TOOL_CALL:
          if (event.text) {
            lines.push(
              <ToolCommand key={`tool-${lineIndex++}`} opacity={eventOpacity}>
                {event.text}
              </ToolCommand>
            );
          }
          break;

        case EventType.TOOL_OUTPUT:
          if (event.output) {
            event.output.forEach((line, idx) => {
              lines.push(
                <OutputLine
                  key={`output-${lineIndex++}-${idx}`}
                  opacity={eventOpacity * 0.9}
                  color={line.includes('✓') ? TERMINAL_COLORS.SUCCESS : undefined}
                >
                  {line}
                </OutputLine>
              );
            });
          }
          break;

        case EventType.ARTIFACT_CREATED:
          if (event.text) {
            lines.push(
              <SuccessMessage key={`artifact-${lineIndex++}`} opacity={eventOpacity}>
                {event.text}
              </SuccessMessage>
            );
          }
          break;

        case EventType.SYSTEM_MESSAGE:
          lines.push(
            <SystemMessage key={`system-${lineIndex++}`} opacity={eventOpacity}>
              {event.text}
            </SystemMessage>
          );
          break;

        case EventType.SUCCESS_MESSAGE:
          lines.push(
            <SuccessMessage key={`success-${lineIndex++}`} opacity={eventOpacity}>
              {event.text}
            </SuccessMessage>
          );
          break;

        case EventType.ERROR_MESSAGE:
          lines.push(
            <ErrorMessage key={`error-${lineIndex++}`} opacity={eventOpacity}>
              {event.text}
            </ErrorMessage>
          );
          break;

        default:
          break;
      }
    }

    return lines;
  };

  return (
    <TerminalWindow opacity={opacity}>
      <TerminalHeader>
        <WindowButton color="#ff5f56" />
        <WindowButton color="#ffbd2e" />
        <WindowButton color="#27ca40" />
        <TerminalTitle>Farm Friend Terminal v3.2.1 | Session: 8f4a2c | CPU: 12%</TerminalTitle>
      </TerminalHeader>

      <TerminalBody scrollOffset={scrollOffset}>
        <ScrollContent translateY={-scrollOffset + 100}>
          {renderContent()}
        </ScrollContent>
      </TerminalBody>
    </TerminalWindow>
  );
};
