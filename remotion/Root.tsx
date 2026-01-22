import React from 'react';
import { Composition } from 'remotion';
import { FFTerminalDemo } from './FFTemo';
import { Audio } from './components/Audio';
import { TerminalAnimation } from './components/TerminalAnimation';
import { AgentThinking } from './components/AgentThinking';
import { ToolCall } from './components/ToolCall';
import { ArtifactPreview } from './components/ArtifactPreview';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FFTdemo"
        component={FFTerminalDemo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
