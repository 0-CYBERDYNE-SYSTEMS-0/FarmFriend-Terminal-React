# FF Terminal - Remotion Video Demo

A robust 30-second promotional video for FF Terminal AI agent system.

## 🎬 Video Overview

**Duration:** 30 seconds (900 frames @ 30 FPS)
**Resolution:** 1920x1080 (Full HD)
**Composition:** Multi-scene showcase

### Scenes (Timeline)

| Time | Scene | Content |
|-------|--------|----------|
| 0-2s | Title | FF Terminal branding fade in/out |
| 2-28s | Terminal | Live terminal interface with code, tools, artifacts |
| 2-6s | Agent Thinking | AI agent processing indicators |
| 4-12s | Tool Calls | Dynamic showcase of 6 agent tools |
| 8-16s | Artifacts | 3 generated artifacts (reports, JSON, YAML) |
| 24-28s | Terminal Interaction | Final terminal action |
| 28-30s | Call to Action | Final artifact + branding |

## 🚀 Quick Start

### Preview in Browser
```bash
node remotion/preview-remotion.mjs
```

### Render to MP4
```bash
node remotion/preview-remotion.mjs --render
```

Output: `remotion/out/ff-terminal-demo.mp4`

## 📦 What It Showcases

### 1. Terminal Interface
- Modern dark-themed CLI
- Auto-scrolling content
- Typing animation for prompts
- Color-coded output (success, warnings, system messages)

### 2. Agent Intelligence
- Real-time thinking indicators
- Progress bars for long operations
- Model/provider information
- Processing steps visualization

### 3. Tool Capabilities
- **📄 read** - File operations
- **🔍 web_search** - Web research
- **✏️ write** - Content generation
- **🔨 exec** - Command execution
- **🖼️ image** - Image generation
- **📊 code** - Code analysis

### 4. Artifacts & Outputs
- **Markdown reports** (soil health analysis)
- **JSON data** (yield predictions)
- **YAML configs** (automation pipelines)

## 🎨 Visual Design

**Color Palette:**
- Background: Dark gradient (#0a0e27 → #1a1f2e)
- Primary: Neon green (#00ff88)
- Secondary: Cyan (#00d4ff)
- Accent: Gold (#ffd700)
- Error: Red (#ff6b6b)

**Typography:**
- Terminal: SF Mono, Monaco, Inconsolata
- UI: System fonts (San Francisco, Inter)
- Code: Monospace

**Animations:**
- Spring physics for smooth entrances
- Interpolation for timing control
- Fade in/out transitions
- Scale transformations for focus

## 🛠️ Technical Details

### Remotion Configuration
- **OutDir:** `out/`
- **Overwrite:** Enabled
- **Display Server Port:** 9999
- **Webpack:** React alias resolution

### Dependencies
```json
{
  "remotion": "latest",
  "@remotion/cli": "latest",
  "@remotion/player": "latest",
  "styled-components": "latest"
}
```

### Components
- `FFTemo.tsx` - Main composition with scene orchestration
- `TerminalAnimation.tsx` - Terminal UI with scrolling
- `AgentThinking.tsx` - AI agent thinking visualization
- `ToolCall.tsx` - Tool call showcase panel
- `ArtifactPreview.tsx` - Generated artifact cards
- `Audio.tsx` - Audio placeholder (ready for music)

## 📝 Next Steps

### Add Background Music
1. Find suitable tech/AI background music
2. Place in `remotion/assets/` folder
3. Update `Audio.tsx` with correct path
4. Adjust timing as needed

### Customize Content
- Edit `CODE_LINES` in `TerminalAnimation.tsx`
- Update `TOOLS` in `ToolCall.tsx`
- Modify `ARTIFACTS` in `ArtifactPreview.tsx`

### Render Production Video
```bash
# Render at higher quality
npx remotion render FFTdemo out/ff-terminal-demo-1080p.mp4 --codec=h264 --crf=18

# Render 4K version
npx remotion render FFTdemo out/ff-terminal-demo-4k.mp4 --scale=2
```

## 📊 Video Stats

- **Total Components:** 6
- **Total Lines:** ~900
- **Animations:** 15+
- **Scene Transitions:** 6
- **Duration:** 30 seconds exactly

## ✅ Quality Check

- [x] Multi-layer composition (4+ concurrent elements)
- [x] Smooth spring physics animations
- [x] Proper opacity transitions
- [x] Responsive typography
- [x] Dark theme with neon accents
- [x] Realistic terminal interface
- [x] Agent thinking visualization
- [x] Tool call timing
- [x] Artifact previews
- [x] Fade in/out scenes

## 🎯 Use Cases

- Product demo videos
- Conference presentations
- Social media (YouTube, Twitter, LinkedIn)
- Investor pitches
- Landing page hero video
- Explainer videos

---

**Built with ❤️ using Remotion and React**
