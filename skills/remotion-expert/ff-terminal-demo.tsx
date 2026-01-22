import React from 'react';
import {
  Composition,
  Sequence,
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Easing,
} from 'remotion';

// Terminal Component
const TerminalWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
        fontFamily: '"Monaco", "Menlo", "Courier New", monospace',
        overflow: 'hidden',
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          background: '#1a1a2e',
          borderBottom: '1px solid #333',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, background: '#ff5f57', borderRadius: '50%' }} />
        <div style={{ width: 12, height: 12, background: '#febc2e', borderRadius: '50%' }} />
        <div style={{ width: 12, height: 12, background: '#28c940', borderRadius: '50%' }} />
        <div style={{ marginLeft: 12, color: '#888', fontSize: 12 }}>
          ff-terminal — IoT Setup
        </div>
      </div>

      {/* Terminal Content */}
      <div
        style={{
          padding: '24px',
          color: '#e0e0e0',
          fontSize: 14,
          lineHeight: 1.6,
          height: 'calc(100% - 40px)',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// Blinking cursor
const Cursor: React.FC<{ visible: boolean }> = ({ visible }) => {
  return (
    <span
      style={{
        background: visible ? '#00ff88' : 'transparent',
        width: '8px',
        height: '1em',
        display: 'inline-block',
        marginLeft: 2,
      }}
    />
  );
};

// Typing animation component
const TypingText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame: number;
  color?: string;
}> = ({ text, startFrame, charsPerFrame, color = '#00ff88' }) => {
  const frame = useCurrentFrame();
  const charIndex = Math.max(0, Math.floor((frame - startFrame) * charsPerFrame));
  const displayText = text.slice(0, charIndex);
  const isTyping = charIndex < text.length;

  return (
    <div style={{ color }}>
      {displayText}
      <Cursor visible={isTyping && Math.floor((frame / 6) % 2) === 0} />
    </div>
  );
};

// Fade-in text component
const FadeInText: React.FC<{
  text: string;
  startFrame: number;
  duration: number;
  delay?: number;
  color?: string;
}> = ({ text, startFrame, duration, delay = 0, color = '#e0e0e0' }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [startFrame + delay, startFrame + delay + duration],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div style={{ opacity, color }}>
      {text}
    </div>
  );
};

// Main Video Component
export const FFTerminalDemo: React.FC = () => {
  const fps = 30;

  return (
    <TerminalWindow>
      {/* Prompt 1: Initial command */}
      <Sequence from={0} durationInFrames={300}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#888' }}>user@studio ~</div>
          <TypingText
            text="$ npm run dev -- start iot-setup"
            startFrame={0}
            charsPerFrame={0.15}
            color="#00ff88"
          />
        </div>
      </Sequence>

      {/* Output: Starting daemon */}
      <Sequence from={45} durationInFrames={600}>
        <FadeInText
          text="Starting FF-terminal daemon..."
          startFrame={45}
          duration={20}
          color="#61dafb"
        />
        <div style={{ marginTop: 12 }}>
          <FadeInText
            text="✓ WebSocket server listening on ws://localhost:28888"
            startFrame={80}
            duration={15}
            color="#4ade80"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <FadeInText
            text="✓ Connected to profile: iot-setup"
            startFrame={110}
            duration={15}
            color="#4ade80"
          />
        </div>
      </Sequence>

      {/* Prompt 2: Task initialization */}
      <Sequence from={120} durationInFrames={500}>
        <div style={{ marginTop: 20, marginBottom: 16 }}>
          <div style={{ color: '#888' }}>ff-terminal › </div>
          <TypingText
            text="Initializing IoT device discovery..."
            startFrame={120}
            charsPerFrame={0.12}
            color="#fbbf24"
          />
        </div>
      </Sequence>

      {/* Thinking process */}
      <Sequence from={200} durationInFrames={400}>
        <div style={{ marginTop: 12, opacity: 0.7, borderLeft: '3px solid #8b5cf6', paddingLeft: 12 }}>
          <FadeInText
            text="[thinking] Analyzing network configuration..."
            startFrame={200}
            duration={20}
            color="#c084fc"
          />
          <div style={{ marginTop: 8 }}>
            <FadeInText
              text="[thinking] Scanning available protocols: WiFi, Bluetooth, Zigbee"
              startFrame={235}
              duration={20}
              color="#c084fc"
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <FadeInText
              text="[thinking] Preparing device pairing interface"
              startFrame={270}
              duration={20}
              color="#c084fc"
            />
          </div>
        </div>
      </Sequence>

      {/* Tool execution */}
      <Sequence from={380} durationInFrames={450}>
        <div style={{ marginTop: 16 }}>
          <FadeInText
            text="[tool] scan_network_devices"
            startFrame={380}
            duration={15}
            color="#06b6d4"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <FadeInText
            text="  └─ Found 4 compatible devices"
            startFrame={410}
            duration={15}
            color="#22d3ee"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <FadeInText
            text="[tool] configure_pairing"
            startFrame={440}
            duration={15}
            color="#06b6d4"
          />
        </div>
        <div style={{ marginTop: 8 }}>
          <FadeInText
            text="  └─ Generated pairing tokens for setup"
            startFrame={470}
            duration={15}
            color="#22d3ee"
          />
        </div>
      </Sequence>

      {/* Interactive prompt */}
      <Sequence from={620} durationInFrames={300}>
        <div style={{ marginTop: 20, padding: 12, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 4 }}>
          <FadeInText
            text="Select device to configure:"
            startFrame={620}
            duration={15}
            color="#c084fc"
          />
          <div style={{ marginTop: 12 }}>
            <FadeInText
              text="  [1] Living Room Hub (192.168.1.45)"
              startFrame={650}
              duration={10}
              color="#ddd"
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <FadeInText
              text="  [2] Garage Sensor (192.168.1.46)"
              startFrame={665}
              duration={10}
              color="#ddd"
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <FadeInText
              text="  [3] Bedroom Monitor (192.168.1.47)"
              startFrame={680}
              duration={10}
              color="#ddd"
            />
          </div>
          <div style={{ marginTop: 6 }}>
            <FadeInText
              text="  [4] Kitchen Control (192.168.1.48)"
              startFrame={695}
              duration={10}
              color="#ddd"
            />
          </div>
        </div>
      </Sequence>

      {/* User input selection */}
      <Sequence from={750} durationInFrames={150}>
        <div style={{ marginTop: 16 }}>
          <TypingText
            text="→ Enter selection (1-4): 1"
            startFrame={750}
            charsPerFrame={0.15}
            color="#00ff88"
          />
        </div>
      </Sequence>

      {/* Configuration process */}
      <Sequence from={820} durationInFrames={400}>
        <div style={{ marginTop: 16 }}>
          <FadeInText
            text="Configuring Living Room Hub..."
            startFrame={820}
            duration={15}
            color="#61dafb"
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <FadeInText
            text="  ✓ WiFi connection established"
            startFrame={855}
            duration={12}
            color="#4ade80"
          />
        </div>
        <div style={{ marginTop: 6 }}>
          <FadeInText
            text="  ✓ Time synchronized (UTC+0)"
            startFrame={875}
            duration={12}
            color="#4ade80"
          />
        </div>
        <div style={{ marginTop: 6 }}>
          <FadeInText
            text="  ✓ Firmware up to date (v2.4.1)"
            startFrame={895}
            duration={12}
            color="#4ade80"
          />
        </div>
        <div style={{ marginTop: 6 }}>
          <FadeInText
            text="  ✓ Sensors calibrated"
            startFrame={915}
            duration={12}
            color="#4ade80"
          />
        </div>
      </Sequence>

      {/* Completion */}
      <Sequence from={1100} durationInFrames={200}>
        <div style={{ marginTop: 20, padding: 12, background: 'rgba(74, 222, 128, 0.1)', borderRadius: 4, border: '1px solid #4ade80' }}>
          <FadeInText
            text="✓ Setup completed successfully!"
            startFrame={1100}
            duration={15}
            color="#4ade80"
          />
          <div style={{ marginTop: 8 }}>
            <FadeInText
              text="Device is online and ready. Access at http://192.168.1.45:8080"
              startFrame={1125}
              duration={15}
              color="#22c55e"
            />
          </div>
        </div>
      </Sequence>

      {/* Final prompt */}
      <Sequence from={1250} durationInFrames={150}>
        <div style={{ marginTop: 20 }}>
          <div style={{ color: '#888' }}>user@studio ~</div>
          <div style={{ color: '#00ff88', marginTop: 4 }}>
            $
            <Cursor visible={Math.floor((useCurrentFrame() / 6) % 2) === 0} />
          </div>
        </div>
      </Sequence>
    </TerminalWindow>
  );
};

// Root component with composition registration
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FFTerminalDemo"
      component={FFTerminalDemo}
      durationInFrames={1400}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
