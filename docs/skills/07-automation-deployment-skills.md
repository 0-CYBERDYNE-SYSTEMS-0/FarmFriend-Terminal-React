# Automation & Deployment Skills

> **Messaging, bots, and deployment automation**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Automation and deployment skills enable communication platform integration, bot creation, and deployment automation. These skills connect FF Terminal to Discord, Slack, Telegram, and hosting platforms.

### Skills in This Category

| Skill | Purpose | Platform |
|-------|---------|----------|
| `telegram-bot-creator` | Complete Telegram bot creation | Telegram |
| `discord` | Discord messaging and management | Discord |
| `discord-server` | Full Discord server integration | Discord |
| `slack` | Slack reactions, messages, pins | Slack |

---

## telegram-bot-creator

### Purpose
Complete Telegram bot creation for AI agents and pipelines. Build end-to-end bots that bridge backend agents/logic to Telegram chat. Supports multiple frameworks, LLM integration, and various deployment options.

### Installation

```bash
# Using pip
pip install python-telegram-bot

# Or aiogram
pip install aiogram
```

### Usage

```bash
# Create new bot project
telegram-bot-creator create --name mybot --framework python-telegram-bot

# Add LLM integration
telegram-bot-creator add-llm --bot mybot --provider claude

# Deploy to polling
telegram-bot-creator deploy --bot mybot --mode polling

# Deploy to webhook
telegram-bot-creator deploy --bot mybot --mode webhook --url https://your-domain.com
```

### Frameworks Supported

| Framework | Pros | Cons |
|-----------|------|------|
| `python-telegram-bot` | Mature, well-documented | Python 3.7+ only |
| `aiogram` | Fast, async | Python 3.8+ only |
| `pyTelegramBotAPI` | Simple, synchronous | Limited async support |

### Bot Creation Pattern

**Step 1: Scaffold project**
```bash
telegram-bot-creator create --name ai-assistant --framework python-telegram-bot
cd ai-assistant
```

**Step 2: Configure bot token**
```bash
export TELEGRAM_BOT_TOKEN="your-bot-token"
# Or edit config.yaml
```

**Step 3: Implement handlers**
```python
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

async def start(update: Update, context):
    await update.message.reply_text("Hello! I'm your AI assistant.")

async def echo(update: Update, context):
    await update.message.reply_text(update.message.text)

app = Application.builder().token("TOKEN").build()
app.add_handler(CommandHandler("start", start))
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
app.run_polling()
```

### LLM Integration

**Claude Integration:**
```bash
telegram-bot-creator add-llm --bot mybot --provider claude
```

```python
import anthropic

client = anthropic.Anthropic()

async def ask_claude(update: Update, context):
    message = update.message.text
    response = client.messages.create(
        model="claude-3-5-sonnet",
        max_tokens=1024,
        messages=[{"role": "user", "content": message}]
    )
    await update.message.reply_text(response.content[0].text)
```

**OpenRouter Integration:**
```bash
telegram-bot-creator add-llm --bot mybot --provider openrouter
```

### Multi-Step Workflows

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# Conversation state
conv_state = {}

async def survey_start(update: Update, context):
    keyboard = [
        [InlineKeyboardButton("Yes", callback_data='yes'),
         InlineKeyboardButton("No", callback_data='no')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Start survey?", reply_markup=reply_markup)

async def survey_answer(update: Update, context):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(f"You chose: {query.data}")
    # Continue to next question...
```

### Deployment Options

**Polling (local):**
```bash
python bot.py
# Good for: Development, personal bots
```

**Webhook (server):**
```bash
# Set webhook
curl -F "url=https://your-domain.com/bot TOKEN" \
     https://api.telegram.org/botTOKEN/setWebhook

# Run server
gunicorn bot:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Deploy to cloud:**
```bash
telegram-bot-creator deploy --bot mybot --provider railway
telegram-bot-creator deploy --bot mybot --provider render
telegram-bot-creator deploy --bot mybot --provider fly.io
```

### Use Cases

1. **AI Customer Support** - Claude + Telegram bot
2. **Newsletter Bot** - Scheduled content distribution
3. **Alert System** - CI/CD notifications to Telegram
4. **Command Bot** - Slash commands for system operations
5. **Group Manager** - Moderation and utilities

---

## discord

### Purpose
Control Discord from FF Terminal. Send messages, react, upload stickers, run polls, manage threads/pins, fetch member info, and handle moderation actions.

### Requirements

```yaml
config:
  channels.discord: # Required
```

### Actions

| Action Group | Capabilities |
|--------------|--------------|
| **Reactions** | Add/remove reactions, list reaction users |
| **Messages** | Send, edit, delete, read recent |
| **Pins** | Pin, unpin, list pinned items |
| **Member Info** | Fetch user profile, roles |
| **Channels** | List, create, edit, delete |
| **Moderation** | Kick, ban, timeout members |

### Message Actions

**Send message:**
```json
{
  "action": "sendMessage",
  "to": "channel:C123",
  "content": "Hello from FF Terminal"
}
```

**Edit message:**
```json
{
  "action": "editMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "content": "Updated content"
}
```

**Delete message:**
```json
{
  "action": "deleteMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

**Read messages:**
```json
{
  "action": "readMessages",
  "channelId": "C123",
  "limit": 20
}
```

### Reaction Actions

**React to message:**
```json
{
  "action": "react",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "emoji": "✅"
}
```

**List reactions:**
```json
{
  "action": "reactions",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### Pin Actions

**Pin message:**
```json
{
  "action": "pinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

**List pinned items:**
```json
{
  "action": "listPins",
  "channelId": "C123"
}
```

### Member Actions

**Get member info:**
```json
{
  "action": "memberInfo",
  "userId": "U123"
}
```

### Example Workflows

**Announce deployment:**
```json
{
  "action": "sendMessage",
  "to": "channel:deployments",
  "content": "🚀 Deployment started: feature/new-api"
}
```

**Mark complete:**
```json
{
  "action": "react",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "emoji": "✅"
}
```

**Pin important message:**
```json
{
  "action": "pinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

---

## discord-server

### Purpose
Complete Discord server interaction via Discord bot API. Post AI-generated content, download images, automate notifications, manage bot messages, read channel content, respond to mentions, and full server integration.

### Use Cases

1. **Post AI-generated images** - Upload images to channels
2. **Download for processing** - Download attachments from Discord
3. **Automate notifications** - CI/CD, alerts, announcements
4. **Manage bot messages** - Edit/delete bot content
5. **Read channel messages** - Monitor for keywords, extract data
6. **Respond to mentions** - @bot triggers
7. **Channel management** - Create, edit, organize channels

### Upload Image

```json
{
  "action": "uploadImage",
  "channelId": "C123",
  "filePath": "/path/to/image.png",
  "caption": "AI-generated image"
}
```

### Download Attachment

```json
{
  "action": "downloadAttachment",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "outputPath": "/tmp/downloaded.png"
}
```

### Respond to Mention

```json
{
  "action": "respondToMention",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "content": "Thanks for the ping! How can I help?"
}
```

### Create Channel

```json
{
  "action": "createChannel",
  "serverId": "G123",
  "name": "new-channel",
  "type": "text"
}
```

### Workflow Example: AI Image Pipeline

```bash
# 1. Generate image
python3 {baseDir}/scripts/gen.py --prompt "Cyberpunk city" --count 1

# 2. Post to Discord
{
  "action": "uploadImage",
  "channelId": "C123",
  "filePath": "/tmp/openai-image-gen-*/image_001.png",
  "caption": "🖼️ Generated: Cyberpunk cityscape"
}

# 3. Download reactions
{
  "action": "reactions",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

---

## slack

### Purpose
Control Slack from FF Terminal. React to messages, manage pins, send/edit/delete messages, and fetch member info using the configured bot token.

### Requirements

```yaml
config:
  channels.slack: # Required
```

### Actions

| Action Group | Default | Description |
|--------------|---------|-------------|
| **Reactions** | ✅ | Add/remove reactions |
| **Messages** | ✅ | Send, edit, delete, read |
| **Pins** | ✅ | Pin, unpin, list |
| **Member Info** | ✅ | User profile, status |
| **Emoji List** | ✅ | Custom emoji inventory |

### Message Actions

**Send message:**
```json
{
  "action": "sendMessage",
  "to": "channel:C123",
  "content": "Hello from FF Terminal"
}
```

**Edit message:**
```json
{
  "action": "editMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "content": "Updated text"
}
```

**Delete message:**
```json
{
  "action": "deleteMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

**Read messages:**
```json
{
  "action": "readMessages",
  "channelId": "C123",
  "limit": 20
}
```

### Reaction Actions

**React:**
```json
{
  "action": "react",
  "channelId": "C123",
  "messageId": "1712023032.1234",
  "emoji": "✅"
}
```

**List reactions:**
```json
{
  "action": "reactions",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

### Pin Actions

**Pin:**
```json
{
  "action": "pinMessage",
  "channelId": "C123",
  "messageId": "1712023032.1234"
}
```

**List pins:**
```json
{
  "action": "listPins",
  "channelId": "C123"
}
```

### Member Actions

**Get member info:**
```json
{
  "action": "memberInfo",
  "userId": "U123"
}
```

### Ideas to Try

- ✅ React to mark completed tasks
- 📌 Pin key decisions or weekly status updates
- 💬 Send automated daily standup reminders
- 👤 Fetch member info for team directories

---

## Workflow Examples

### Complete CI/CD Notification System

```bash
#!/bin/bash
# notify.sh - CI/CD notifications to Discord + Slack

CHANNEL=$1
STATUS=$2
MESSAGE=$3

# Discord notification
{
  "action": "sendMessage",
  "to": "channel:$CHANNEL",
  "content": "🚨 **$STATUS**: $MESSAGE"
}

# Slack notification
{
  "action": "sendMessage",
  "to": "channel:$CHANNEL",
  "content": "🚨 *$STATUS*: $MESSAGE"
}

# React based on status
EMOJI=$([[ "$STATUS" == "success" ]] && echo "✅" || echo "❌")
{
  "action": "react",
  "channelId": "$CHANNEL",
  "messageId": "$MESSAGE_ID",
  "emoji": "$EMOJI"
}
```

### Telegram Bot for GitHub Updates

```python
# bot.py
from telegram import Update
from telegram.ext import Application, CommandHandler
import requests

GITHUB_TOKEN = "your-github-token"
CHANNEL_ID = "your-channel-id"

async def github_webhook(update: Update, context):
    # Handle GitHub webhook payload
    data = update.message.text
    await context.bot.send_message(
        chat_id=CHANNEL_ID,
        text=f"📦 *{data['repository']}*: {data['action']}",
        parse_mode="Markdown"
    )

app = Application.builder().token("TOKEN").build()
app.add_handler(MessageHandler(filters.TEXT, github_webhook))
app.run_polling()
```

### Automated Content Distribution

```bash
# 1. Generate content
python3 {baseDir}/scripts/gen.py --prompt "Tech news" --count 1

# 2. Post to Discord
{
  "action": "uploadImage",
  "channelId": "C123",
  "filePath": "/tmp/image.png",
  "caption": "📰 Weekly Tech Digest"
}

# 3. Post to Slack
{
  "action": "sendMessage",
  "to": "channel:C456",
  "content": "📰 *Weekly Tech Digest*\nCheck out the latest!"
}

# 4. Pin in Slack for visibility
{
  "action": "pinMessage",
  "channelId": "C456",
  "messageId": "1712023032.1234"
}
```

---

## Automation & Deployment Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Create Telegram bot | `telegram-bot-creator` | Full framework support |
| Add LLM to bot | `telegram-bot-creator add-llm` | Claude, OpenRouter |
| Deploy bot | `telegram-bot-creator deploy` | Polling or webhook |
| Discord messages | `discord` | Reactions, pins, edits |
| Discord server management | `discord-server` | Upload/download, channels |
| Slack messages | `slack` | Same API as Discord |
| CI/CD notifications | `discord` + `slack` | Cross-platform alerts |
| AI image posting | `discord-server` | Upload images to Discord |
| Pin important messages | `discord` + `slack` | Both support pins |
| React to messages | `discord` + `slack` | Unicode or emoji names |

---

## Best Practices Summary

### Telegram Bots
- Use webhooks for production, polling for dev
- Store bot token securely (environment variables)
- Implement rate limiting to avoid throttling
- Use inline keyboards for better UX

### Discord
- Use channel IDs (C123) instead of names
- Message IDs are timestamps (1712023032.1234)
- React with Unicode or :name: format
- Handle rate limits gracefully

### Slack
- Similar API to Discord
- Custom emoji inventory available
- Member info includes status and profile
- Pin important items for team visibility

### Cross-Platform
- Use consistent message formatting
- Implement retry logic for failures
- Log all actions for debugging
- Separate dev/prod channels

---

## Next Steps

- **Build Telegram bots** - Start with simple echo bot, escalate to AI
- **Set up notifications** - CI/CD alerts to Discord/Slack
- **Create content pipeline** - Generate → Post → Track engagement
- **Explore bot features** - Slash commands, inline keyboards, conversations
- **Deploy to production** - Use webhooks, proper error handling

---

**For complete automation & deployment skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
