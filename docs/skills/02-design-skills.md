# Design Skills

> **Creative media generation and design automation**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Design skills enable creative work through AI-powered image generation, video production, animation, and visual content creation. These skills leverage models like DALL-E, GPT Image, and Remotion to produce professional-grade media programmatically.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `award_winning_designer` | AI design generation | DALL-E / GPT Image |
| `openai-image-gen` | Batch image generation | OpenAI Images API |
| `remotion` | React-based video production | Remotion CLI |
| `remotion-expert` | Advanced video techniques | Remotion + Three.js |
| `nano-banana-pro` | Media asset processing | Custom CLI |
| `video-frames` | Video frame extraction | FFmpeg |

---

## award_winning_designer

### Purpose
Generate award-winning visual designs using AI image generation models. Creates stunning visuals for marketing, branding, UI concepts, and creative projects.

### Capabilities
- **Brand identity** - Logos, color palettes, typography systems
- **UI/UX mockups** - App interfaces, websites, dashboards
- **Marketing assets** - Social media graphics, banners, ads
- **Illustrations** - Custom artwork, icons, illustrations
- **Product shots** - Product photography, lifestyle images

### Usage

```bash
# Generate brand identity
award_winning_designer "Create a modern tech startup brand identity"

# Design UI mockup
award_winning_designer "Design a minimalist dashboard for a finance app"

# Create marketing banner
award_winning_designer "Design an eye-catching banner for summer sale"
```

### Patterns

**Brand Identity Generation**
```
Prompt structure:
"[Style] brand identity for [industry/company] featuring [key elements]"
```

**UI/UX Design**
```
Prompt structure:
"[Platform] [app type] UI design with [aesthetic style] and [key features]"
```

### Best Practices
- Specify resolution (1024x1024, 1536x1024, etc.)
- Include style references (minimalist, brutalist, playful)
- Specify output format (PNG, JPEG, WebP)
- Use iteration for refinement

---

## openai-image-gen

### Purpose
Batch-generate images via OpenAI Images API with random prompt sampling and HTML gallery output. Perfect for rapid prototyping and exploring visual concepts.

### Key Features
- **Random prompt generator** - Structured randomness for variety
- **Batch processing** - Generate 4-16 images at once
- **HTML gallery** - Auto-generated thumbnail gallery
- **Model support** - DALL-E 2, DALL-E 3, GPT Image models
- **Custom prompts** - Override random generator

### Installation

```bash
# Python and OpenAI API key required
pip install openai
export OPENAI_API_KEY="sk-..."
```

### Usage

```bash
# Generate batch of 16 images
python3 {baseDir}/scripts/gen.py --count 16 --model gpt-image-1

# Custom prompt
python3 {baseDir}/scripts/gen.py --prompt "lobster astronaut in space" --count 4

# High quality, landscape
python3 {baseDir}/scripts/gen.py --size 1536x1024 --quality high

# DALL-E 3 (HD, vivid style)
python3 {baseDir}/scripts/gen.py --model dall-e-3 --quality hd --style vivid

# View gallery
open ~/Projects/tmp/openai-image-gen-*/index.html
```

### Model Parameters

| Parameter | DALL-E 3 | DALL-E 2 | GPT Image |
|-----------|----------|----------|-----------|
| **Max Count** | 1 | 10 | 10 |
| **Sizes** | 1024x1024, 1792x1024, 1024x1792 | 256x256, 512x512, 1024x1024 | 1024x1024, 1536x1024, 1024x1536 |
| **Quality** | standard, HD | standard | low, medium, high |
| **Style** | vivid, natural | - | - |
| **Format** | PNG | PNG | PNG, JPEG, WebP |

### Output Structure

```
openai-image-gen-<timestamp>/
├── image_001.png
├── image_002.png
├── ...
├── prompts.json       # Prompt → file mapping
└── index.html         # Thumbnail gallery
```

### Pro Tips

- Use `dall-e-3` for single high-quality images (best for final assets)
- Use `gpt-image-1` or `dall-e-2` for batch generation (exploration)
- `--style vivid` for dramatic, hyper-real results
- `--style natural` for more subtle, photorealistic output
- Specify `--background transparent` for PNGs with transparency (GPT models)

---

## remotion

### Purpose
Create professional videos programmatically using React. Generate MP4s, GIFs, and animated content from code with audio, transitions, and complex animations.

### Use Cases
- **Product demos** - Showcasing software features
- **Tutorial videos** - Step-by-step visual guides
- **Social media content** - Reels, TikToks, shorts
- **Marketing videos** - Branded promotional content
- **UI recordings** - Animated interface demonstrations

### Installation

```bash
npm install -g remotion
remotion init my-video
cd my-video
npm install
```

### Quick Start

```bash
# Start preview server
npm start

# Render video
npm run build

# Render specific composition
npx remotion render Video src/Video.mp4 --props='{"title": "Hello"}'

# Preview URL (local)
open http://localhost:3000
```

### Core Concepts

**Composition** - A video component with defined duration:
```tsx
export const Video: React.FC<{title: string}> = ({title}) => {
  return (
    <div style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <h1>{title}</h1>
    </div>
  );
};
```

**Timeline** - Frame-based animation:
```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1]);
```

**Sequencing** - Time-based element appearance:
```tsx
<Sequence from={30} durationInFrames={60}>
  <Content />
</Sequence>
```

### Best Practices

1. **Use `staticFile()` for images** - Never use relative paths
2. **Keep compositions short** - 5-10 seconds is ideal
3. **Test in preview first** - Render only when happy with preview
4. **Optimize assets** - Compress images/audio before importing
5. **Use `can-decode`** - Verify video compatibility before rendering

### Common Issues

**Blank/black images**:
```tsx
// ❌ Wrong - won't work
<img src="image.png" />

// ✅ Correct - loads from /public
import { staticFile } from 'remotion';
<img src={staticFile('image.png')} />
```

**Performance issues**:
- Reduce particle count (start with 3-5, not 10+)
- Remove blur filters (expensive)
- Simplify animations (less rotation/scale)
- Reduce shot count (fewer high-res images)

---

## remotion-expert

### Purpose
Expert-level Remotion techniques covering 3D content, animations, assets, audio, charts, captions, fonts, Lottie, text animations, timing, transitions, and video processing.

### Key Domains

| Domain | Description | Key Files |
|--------|-------------|-----------|
| **3D** | Three.js and React Three Fiber | `rules/3d.md` |
| **Animations** | Core animation patterns | `rules/animations.md` |
| **Assets** | Images, videos, audio, fonts | `rules/assets.md` |
| **Audio** | Import, trim, volume, speed | `rules/audio.md` |
| **Charts** | Data visualization | `rules/charts.md` |
| **Captions** | TikTok-style word highlighting | `rules/display-captions.md` |
| **Fonts** | Google Fonts and local fonts | `rules/fonts.md` |
| **Lottie** | Lottie animations | `rules/lottie.md` |
| **Text** | Typography and text animations | `rules/text-animations.md` |
| **Timing** | Easing, spring animations | `rules/timing.md` |
| **Transitions** | Scene transitions | `rules/transitions.md` |
| **Videos** | Video embedding, trimming | `rules/videos.md` |

### Advanced Patterns

**3D Scene with React Three Fiber**:
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

<Canvas>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
  <OrbitControls />
</Canvas>
```

**Audio Visualization**:
```tsx
const audioData = useAudioData(audioFile);
const { scale } = interpolateAudioData(audioData);
```

**TikTok-Style Captions**:
```tsx
<DisplayCaptions
  subtitles={transcription}
  currentTime={frame / fps}
  style={{ fontSize: 48, color: 'white', textShadow: '2px 2px 4px black' }}
/>
```

### Expert Tips

- **Use `calculate-metadata()`** for dynamic composition properties
- **Measure DOM nodes** with `measuring-dom-nodes` for responsive layouts
- **Extract frames** with `extract-frames` for thumbnail generation
- **Get video dimensions** with `get-video-dimensions` before embedding
- **Use Mediabunny** for audio/video duration and metadata

---

## nano-banana-pro

### Purpose
Advanced media asset processing for video production workflows. Handles image manipulation, format conversion, batch operations, and asset preparation for Remotion and other creative tools.

### Capabilities
- **Image processing** - Resize, crop, format conversion
- **Batch operations** - Process multiple files at once
- **Format optimization** - Compress for web, video production
- **Asset preparation** - Prepare images for Remotion, Framer, etc.

### Usage

```bash
# Resize image to 1920x1080
nano-banana-pro resize --input image.png --output resized.png --width 1920 --height 1080

# Batch convert to WebP
nano-banana-pro convert --input-dir ./images --output-dir ./optimized --format webp

# Optimize for Remotion
nano-banana-optimize --input ./assets --output ./remotion-ready --max-width 1920
```

### Best Practices

- Optimize images before importing to Remotion (improves render speed)
- Use WebP for web, PNG for transparency, JPEG for photos
- Maintain aspect ratio when resizing
- Batch process large asset libraries

---

## video-frames

### Purpose
Extract frames or short clips from videos using FFmpeg. Useful for creating thumbnails, previews, generating assets from video content, and preparing source material for Remotion compositions.

### Installation

```bash
brew install ffmpeg
```

### Usage

```bash
# Extract single frame at timestamp
video-frames extract --input video.mp4 --timestamp 00:05:30 --output frame.png

# Extract frames at regular intervals
video-frames extract --input video.mp4 --interval 5 --output-dir ./frames

# Create video clip from start to end
video-frames clip --input video.mp4 --start 00:01:00 --end 00:02:00 --output clip.mp4

# Generate storyboard (10 frames evenly distributed)
video-frames storyboard --input video.mp4 --count 10 --output-dir ./storyboard
```

### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `--input` | Input video file | `video.mp4` |
| `--timestamp` | Frame extraction time | `00:05:30` or `330` (seconds) |
| `--interval` | Seconds between frames | `5` (every 5 seconds) |
| `--count` | Number of frames (storyboard) | `10` |
| `--start` | Clip start time | `00:01:00` |
| `--end` | Clip end time | `00:02:00` |
| `--output-dir` | Output directory | `./frames` |
| `--format` | Output format (png, jpg) | `jpg` |

### Integration with Remotion

```bash
# 1. Extract frames from source video
video-frames extract --input demo.mp4 --interval 5 --output-dir ./remotion-public

# 2. Import into Remotion composition
// In your Remotion component:
import { staticFile } from 'remotion';
<img src={staticFile('frame_001.jpg')} />
```

### Pro Tips

- Use `png` for quality, `jpg` for smaller files
- Extract more frames for smooth slow-motion effects
- Use `storyboard` mode for planning video structure
- Combine with `remotion-expert` for frame-perfect animations

---

## Workflow Examples

### Complete Brand Identity Package

```bash
# 1. Generate logo variations
python3 {baseDir}/scripts/gen.py --prompt "minimalist tech logo, geometric" --count 5

# 2. Create color palette from logo
award_winning_designer "Generate 5-color palette from minimalist tech aesthetic"

# 3. Design brand guidelines document
award_winning_designer "Brand guidelines document for tech startup"

# 4. Create social media assets
python3 {baseDir}/scripts/gen.py --prompt "Twitter banner, tech startup brand" --count 3
python3 {baseDir}/scripts/gen.py --prompt "LinkedIn post image, professional" --count 5
```

### Product Demo Video

```bash
# 1. Extract UI screens from screen recording
video-frames extract --input screen-recording.mp4 --interval 2 --output-dir ./ui-screens

# 2. Generate placeholder content images
python3 {baseDir}/scripts/gen.py --prompt "professional user avatar" --count 10
python3 {baseDir}/scripts/gen.py --prompt "data dashboard screenshot" --count 5

# 3. Create Remotion project
remotion init product-demo

# 4. Build video composition (see remotion-expert for advanced techniques)
# 5. Render final video
npm run build
```

### Social Media Content Batch

```bash
# Generate 30 Instagram posts (carousel style)
python3 {baseDir}/scripts/gen.py \
  --prompt "Instagram post, lifestyle, [PRODUCT_NAME]" \
  --count 30 \
  --model gpt-image-1 \
  --size 1080x1080

# Create TikTok vertical videos
remotion init tiktok-content
# (Build vertical compositions using remotion-expert patterns)

# Optimize for web
nano-banana-pro convert --input-dir ./output --format webp --quality 85
```

---

## Design Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Logo design | `award_winning_designer` | Iterate 10+ times |
| Brand identity | `award_winning_designer` + `openai-image-gen` | Combine for variety |
| UI mockups | `award_winning_designer` | Specify platform/style |
| Product photography | `openai-image-gen` | Use DALL-E 3 for quality |
| Short videos | `remotion` + `remotion-expert` | React-based control |
| 3D animations | `remotion-expert` | Three.js integration |
| Video assets | `video-frames` | Extract from source |
| Asset optimization | `nano-banana-pro` | Pre-process for web |
| Batch generation | `openai-image-gen` | 10+ images at once |

---

## Next Steps

- **Master Remotion** - Deep dive into `remotion-expert` rules
- **Explore AI image models** - Compare DALL-E 2, DALL-E 3, GPT Image
- **Build portfolio** - Create brand packages and demo videos
- **Automate workflows** - Batch generate social media content
- **Custom skill creation** - Extend design capabilities

---

**For complete design skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
