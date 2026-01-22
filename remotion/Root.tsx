import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { FFTerminalDemo } from './FFTemo';
import { FFDemoV2 } from './FFDemoV2';
import { ScreenshotSlideshow } from './ScreenshotSlideshow';
import { Audio } from './components/Audio';
import { TerminalAnimation } from './components/TerminalAnimation';
import { AgentThinking } from './components/AgentThinking';
import { ToolCall } from './components/ToolCall';
import { ArtifactPreview } from './components/ArtifactPreview';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original 30s demo - preserved */}
      <Composition
        id="FFTdemo"
        component={FFTerminalDemo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* Enhanced 60s demo with realistic terminal flow */}
      <Composition
        id="FFDemoV2"
        component={FFDemoV2}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* Professional Ken Burns screenshot slideshow */}
      <Composition
        id="ScreenshotSlideshow"
        component={ScreenshotSlideshow}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};

registerRoot(RemotionRoot);
