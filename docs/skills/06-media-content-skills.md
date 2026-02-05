# Media & Content Skills

> **Speech-to-text, text-to-speech, and audio processing**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Media and content skills enable audio transcription, voice synthesis, and speech processing. These skills support accessibility, content creation, and voice-enabled automation.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `openai-whisper` | Local speech-to-text | Whisper CLI |
| `sherpa-onnx-tts` | Offline text-to-speech | sherpa-onnx |
| `qwen3-tts` | Cloud text-to-speech | Qwen3 TTS API |

---

## openai-whisper

### Purpose
Local speech-to-text transcription using OpenAI's Whisper CLI. No API key required, runs entirely offline, supports multiple languages and models.

### Installation

```bash
brew install openai-whisper
```

### Usage

```bash
# Basic transcription
whisper audio.mp3

# Specify model
whisper audio.mp3 --model medium

# Output format
whisper audio.mp3 --output_format txt
whisper audio.mp3 --output_format srt
whisper audio.mp3 --output_format vtt

# Translate to English
whisper audio.mp3 --task translate

# Language specification
whisper audio.mp3 --language spanish
whisper audio.mp3 --language de --model large
```

### Models

| Model | Size | VRAM | Speed | Accuracy |
|-------|------|------|-------|----------|
| `tiny` | 39 MB | ~1 GB | Fast | Lower |
| `base` | 74 MB | ~1 GB | Fast | Good |
| `small` | 244 MB | ~2 GB | Medium | Better |
| `medium` | 769 MB | ~5 GB | Slower | High |
| `large` | 1550 MB | ~10 GB | Slow | Highest |
| `turbo` | ~310 MB | ~4 GB | Fast | High |

```bash
# Fast transcription (turbo)
whisper audio.mp3 --model turbo

# High accuracy (large)
whisper audio.mp3 --model large --language en

# Balanced (medium)
whisper audio.mp3 --model medium
```

### Options

| Option | Description |
|--------|-------------|
| `--model` | Whisper model selection |
| `--language` | Source language (auto-detected if omitted) |
| `--task` | `transcribe` or `translate` |
| `--output_dir` | Output directory |
| `--output_format` | `txt`, `srt`, `vtt`, `json`, `tsv` |
| `--device` | `cpu` or `cuda` |
| `--threads` | CPU threads (faster on more cores) |

### Output Formats

**TXT (plain text):**
```bash
whisper audio.mp3 --output_format txt
# → audio.txt
```

**SRT (subtitles):**
```bash
whisper audio.mp3 --output_format srt
# → audio.srt (for video editing)
```

**VTT (web subtitles):**
```bash
whisper audio.mp3 --output_format vtt
# → audio.vtt (for web video)
```

**JSON (structured data):**
```bash
whisper audio.mp3 --output_format json
# → audio.json (segments, timestamps)
```

### Advanced Usage

**Multiple formats:**
```bash
whisper audio.mp3 --output_format txt,srt,vtt
```

**Specific output directory:**
```bash
whisper audio.mp3 --output_dir ./transcripts
```

**CPU optimization:**
```bash
whisper audio.mp3 --model medium --threads 8
```

**Batch transcription:**
```bash
for file in *.mp3; do
  whisper "$file" --model turbo --output_dir ./transcripts
done
```

### Use Cases

**Podcast Transcription:**
```bash
whisper episode-42.mp3 --model medium --output_format txt
whisper episode-42.mp3 --model medium --output_format srt
```

**Meeting Notes:**
```bash
whisper meeting-recording.mp3 --language en --output_format txt
```

**Video Subtitling:**
```bash
whisper video-audio.mp3 --output_format srt
ffmpeg -i video.mp4 -i video-audio.srt -c copy -c:s mov_text output-subtitled.mp4
```

**Translation:**
```bash
whisper spanish-audio.mp3 --task translate --output_format txt
# → English translation
```

### Best Practices

1. **Match model to quality needs** - Turbo for speed, large for accuracy
2. **Specify language** - Improves accuracy, faster than auto-detect
3. **Use SRT for videos** - Easy import to video editors
4. **Batch with shell scripts** - Process multiple files
5. **Check cache** - Models download to `~/.cache/whisper`

---

## sherpa-onnx-tts

### Purpose
Offline text-to-speech using sherpa-onnx. Runs locally without cloud APIs, zero latency, privacy-focused.

### Installation

```bash
# Download runtime (automatic via skill)
# Models: ~/.clawdbot/tools/sherpa-onnx-tts/models/
```

### Environment Setup

```bash
export SHERPA_ONNX_RUNTIME_DIR="~/.clawdbot/tools/sherpa-onnx-tts/runtime"
export SHERPA_ONNX_MODEL_DIR="~/.clawdbot/tools/sherpa-onnx-tts/models"
```

### Usage

```bash
# Basic TTS
sherpa-onnx-tts "Hello, this is a test"

# Output to file
sherpa-onnx-tts "Hello world" --output hello.mp3

# Specify voice/model
sherpa-onnx-tts "Text here" --model lessac-high --output audio.mp3

# Speed adjustment
sherpa-onnx-tts "Text here" --speed 1.2 --output audio.mp3

# Pitch adjustment
sherpa-onnx-tts "Text here" --pitch 1.1 --output audio.mp3
```

### Models Available

| Model | Voice | Quality | Notes |
|-------|-------|---------|-------|
| `lessac-high` | Lessac | High | Natural, expressive |
| `lessac-medium` | Lessac | Medium | Smaller, faster |
| `peter-medium` | Peter | Medium | British accent |
| `amy-medium` | Amy | Medium | American accent |

```bash
# High quality Lessac
sherpa-onnx-tts "Professional announcement" --model lessac-high --output audio.mp3

# Faster model
sherpa-onnx-tts "Quick TTS" --model lessac-medium --output audio.mp3
```

### Options

| Option | Description |
|--------|-------------|
| `--model` | Voice model selection |
| `--output` | Output file path |
| `--speed` | Playback speed (0.5-2.0) |
| `--pitch` | Pitch adjustment (0.5-2.0) |
| `--volume` | Volume (0.1-2.0) |
| `--sample-rate` | Sample rate (22050, 44100, 48000) |

### Use Cases

**Voice Notifications:**
```bash
sherpa-onnx-tts "Build complete" --output /tmp/notify.mp3
afplay /tmp/notify.mp3
```

**Accessibility:**
```bash
# Read article aloud
sherpa-onnx-tts "$(cat article.txt)" --output article-audio.mp3
```

**Podcast Voiceovers:**
```bash
sherpa-onnx-tts "Welcome to our podcast" --model lessac-high --output intro.mp3
sherpa-onnx-tts "Thanks for listening" --model lessac-high --output outro.mp3
```

**Automation Scripts:**
```bash
#!/bin/bash
# Alert script
sherpa-onnx-tts "Deployment started" --output /tmp/alert.mp3
afplay /tmp/alert.mp3
```

### Integration with Other Skills

**With `remotion`:**
```bash
# Generate TTS for video
sherpa-onnx-tts "Welcome to our product demo" --output narration.mp3

# Use in Remotion (see remotion-expert for audio patterns)
```

**Batch Processing:**
```bash
# Generate TTS for multiple paragraphs
while IFS= read -r line; do
  sherpa-onnx-tts "$line" --output "audio/$(echo "$line" | head -c 20).mp3"
done < script.txt
```

### Best Practices

1. **Use high-quality models** - Lessac-high for professional output
2. **Adjust speed/pitch** - 1.0 is natural, adjust for content type
3. **Output to files** - Reuse generated audio
4. **Combine with Whisper** - Transcribe → TTS (voice cloning workflows)
5. **Offline = private** - No data leaves your machine

---

## qwen3-tts

### Purpose
Cloud-based text-to-speech using Qwen3 TTS API. Higher quality voices, more variety, requires internet and API key.

### Installation

```bash
npm install -g qwen-tts
```

### Setup

```bash
export QWEN_API_KEY="your-api-key"
```

### Usage

```bash
# Basic TTS
qwen3-tts "Hello, this is Qwen TTS"

# Specify voice
qwen3-tts "Text here" --voice "alex"

# Output format
qwen3-tts "Text here" --format mp3 --output audio.mp3

# Speed adjustment
qwen3-tts "Text here" --speed 1.0 --output audio.mp3

# Emotional styles
qwen3-tts "Text here" --style cheerful --output audio.mp3
```

### Voices

| Voice | Style | Notes |
|-------|-------|-------|
| `alex` | Male, neutral | General purpose |
| `bella` | Female, warm | Narration |
| `david` | Male, deep | Documentaries |
| `emma` | Female, energetic | Marketing |
| `james` | Male, formal | Business |

```bash
# Cheerful style
qwen3-tts "Great news!" --voice emma --style cheerful

# Documentary style
qwen3-tts "In the depths of the ocean..." --voice david --style calm
```

### Options

| Option | Description |
|--------|-------------|
| `--voice` | Voice selection |
| `--style` | Emotional style |
| `--speed` | Playback speed |
| `--format` | Output format (mp3, wav, ogg) |
| `--sample-rate` | Audio quality |

### Advanced Usage

**Streaming (real-time):**
```bash
qwen3-tts "Long text content" --stream | player
```

**SSML Support:**
```bash
qwen3-tts '
<speak>
  <prosody rate="fast" pitch="+2st">
    This is <emphasis>important</emphasis>.
  </prosody>
  <break time="500ms"/>
  And this continues.
</speak>
' --output ssml-audio.mp3
```

**Batch Voices:**
```bash
# Different voices for dialogue
qwen3-tts "Hello, how are you?" --voice emma --output line1.mp3
qwen3-tts "I'm doing great, thanks!" --voice alex --output line2.mp3
```

### Comparison: sherpa-onnx vs qwen3-tts

| Feature | sherpa-onnx-tts | qwen3-tts |
|---------|-----------------|-----------|
| **Offline** | ✅ Yes | ❌ No |
| **Privacy** | ✅ 100% local | ⚠️ Cloud |
| **Speed** | ⚠️ Depends on hardware | ✅ Fast |
| **Voice Variety** | ⚠️ Limited | ✅ Extensive |
| **Quality** | ✅ High | ✅ Very high |
| **Cost** | ✅ Free | 💰 Pay per usage |
| **Setup** | ⚠️ Download models | ⚠️ API key |

### Use When

**Use sherpa-onnx-tts:**
- Offline or privacy-critical
- High-volume, low-cost needs
- Consistent voice quality
- Simple setup

**Use qwen3-tts:**
- Maximum voice variety
- Emotional styles needed
- Highest quality required
- Internet available

---

## Workflow Examples

### Podcast Production Pipeline

```bash
# 1. Transcribe interview audio
whisper interview.mp3 --model medium --output_format txt --output_dir ./transcripts

# 2. Edit transcript (manual step)
# vim ./transcripts/interview.txt

# 3. Generate TTS for intros/outros
sherpa-onnx-tts "Welcome to the podcast" --output intro.mp3

# 4. Generate sponsor read (qwen3-tts for variety)
qwen3-tts "This episode is sponsored by..." --voice bella --style professional --output sponsor.mp3

# 5. Combine in video editor
# Import: interview.mp3, intro.mp3, sponsor.mp3, outro.mp3
```

### Accessibility Audiobook Creation

```bash
# 1. Get book text
cat chapter1.txt > book.txt

# 2. Generate chapter audio (sherpa-onnx for offline)
sherpa-onnx-tts "$(cat chapter1.txt)" --output chapter1.mp3 --speed 0.9

# 3. Generate more chapters
for i in {2..10}; do
  sherpa-onnx-tts "$(cat chapter$i.txt)" --output chapter$i.mp3 --speed 0.9
done

# 4. Combine into audiobook
ffmpeg -f concat -safe 0 -i chapters.txt -c copy audiobook.mp3
```

### Voice Notification System

```bash
#!/bin/bash
# notify.sh - Voice notification system

ALERT_TYPE=$1
MESSAGE=$2

case $ALERT_TYPE in
  success)
    sherpa-onnx-tts "Success: $MESSAGE" --output /tmp/notify.mp3
    ;;
  error)
    sherpa-onnx-tts "Error: $MESSAGE" --output /tmp/notify.mp3
    ;;
  warning)
    sherpa-onnx-tts "Warning: $MESSAGE" --output /tmp/notify.mp3
    ;;
  info)
    sherpa-onnx-tts "$MESSAGE" --output /tmp/notify.mp3
    ;;
esac

afplay /tmp/notify.mp3

# Usage:
# ./notify.sh success "Build completed"
# ./notify.sh error "Tests failed"
```

### Content Localization Workflow

```bash
# 1. Transcribe original (English)
whisper english-audio.mp3 --language en --output_format txt

# 2. Translate (Gemini or Oracle)
gemini "Translate to Spanish" --file english-transcript.txt --output spanish-transcript.txt

# 3. Generate Spanish TTS
sherpa-onnx-tts "$(cat spanish-transcript.txt)" --output spanish-audio.mp3

# 4. Create subtitles (for video)
whisper spanish-audio.mp3 --language es --output_format srt
```

---

## Media & Content Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Podcast transcription | `openai-whisper` | Use --model medium |
| Meeting notes | `openai-whisper` | --output_format txt |
| Video subtitles | `openai-whisper` | --output_format srt |
| Offline TTS | `sherpa-onnx-tts` | 100% local, free |
| Voice notifications | `sherpa-onnx-tts` | Script integration |
| High-quality voices | `qwen3-tts` | More variety |
| Emotional styles | `qwen3-tts` | --style parameter |
| Voice cloning | Combine Whisper + TTS | Transcribe → TTS |
| Audiobook creation | `sherpa-onnx-tts` | Batch processing |
| Subtitle generation | `openai-whisper` | SRT/VTT formats |

---

## Best Practices Summary

### Whisper
- Choose model based on accuracy vs speed needs
- Specify language for better results
- Use SRT for video, TXT for documents
- Batch process with shell scripts

### sherpa-onnx-tts
- Runs completely offline
- Configure paths correctly
- Adjust speed/pitch for content type
- Perfect for high-volume automation

### qwen3-tts
- Use for maximum voice variety
- Explore emotional styles
- Requires API key and internet
- Higher quality than offline options

---

## Next Steps

- **Master Whisper models** - Turbo vs large for different use cases
- **Build TTS pipelines** - Batch processing, quality control
- **Create voice systems** - Notification, accessibility, automation
- **Explore SSML** - Fine-grained TTS control with qwen3-tts
- **Combine skills** - Whisper + TTS for voice transformation

---

**For complete media & content skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
