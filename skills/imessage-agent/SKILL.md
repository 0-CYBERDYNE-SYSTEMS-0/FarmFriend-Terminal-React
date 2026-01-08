---
name: iMessage Agent Bridge
slug: imessage-agent
summary: Read and reply to iMessage/SMS chats via macOS Messages using macos_control KB scripts
description: Enables FarmFriend Terminal to interact with the macOS Messages app for iMessage/SMS when WhatsApp is not used. Supports listing recent chats, reading chat history, sending messages, sending attachments, and creating group chats.
version: "1.0"
author: FarmFriend Terminal
priority: high
tags:
- imessage
- messages
- sms
- macos
- automation
triggers:
- imessage
- iMessage
- messages app
- text message
- sms
- reply via messages
- send iMessage
recommended_tools:
- macos_control
allowed-tools:
- macos_control
- read_file
- write_file
capabilities:
  chat_listing: List recent Messages chats
  chat_history: Read recent messages from a chat
  send_message: Send replies to a recipient
  send_attachment: Send file attachments
  group_chat: Create group chats
---

# iMessage Agent Bridge

Use the macOS Messages app as a fallback channel when WhatsApp is not available. All interactions run through the `macos_control` tool and the Messages KB scripts.

## Supported KB Script IDs (Messages)
- `messages_get_recent_chats`
- `messages_get_chat_history`
- `messages_send_message`
- `messages_send_file`
- `messages_create_group_chat`
- `messages_set_status`

## Quick Start

### 1) List recent chats
```json
{
  "action": "kb_script",
  "kb_script_id": "messages_get_recent_chats",
  "params": {}
}
```

### 2) Read a chat history (by name or participant)
```json
{
  "action": "kb_script",
  "kb_script_id": "messages_get_chat_history",
  "params": { "chatName": "Alex" }
}
```

### 3) Send a message
```json
{
  "action": "kb_script",
  "kb_script_id": "messages_send_message",
  "params": { "recipient": "+15551234567", "messageText": "Copy that. I will follow up shortly." }
}
```

### 4) Send a file attachment
```json
{
  "action": "kb_script",
  "kb_script_id": "messages_send_file",
  "params": { "recipient": "+15551234567", "filePath": "/Users/you/Documents/report.pdf" }
}
```

### 5) Create a group chat
```json
{
  "action": "kb_script",
  "kb_script_id": "messages_create_group_chat",
  "params": { "recipientList": "Alex, Sam, Jamie" }
}
```

## Interaction Pattern
1. List recent chats to locate the correct thread.
2. Pull chat history for context.
3. Draft reply in plain language.
4. Send reply via `messages_send_message`.
5. Record key details in `LOG.md` or `MEMORY.md` if it matters long-term.

## Notes
- Requires macOS and the Messages app to be available.
- iMessage/SMS delivery is controlled by the user's Apple ID and carrier.
- For continuous monitoring, poll at intervals and compare last message timestamps before responding.
