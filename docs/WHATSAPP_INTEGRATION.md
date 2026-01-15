# WhatsApp Integration for FF-Terminal

Interact with FF-Terminal directly through WhatsApp using the Baileys library integration.

## Overview

The WhatsApp integration allows you to:
- Send messages to FF-Terminal from WhatsApp
- Receive AI responses in your WhatsApp chats
- Use all FF-Terminal tools and capabilities via WhatsApp
- Manage access control with pairing codes
- Support both direct messages and group chats

## Architecture

The integration uses:
- **Baileys** - TypeScript WhatsApp Web client library
- Device linking (like WhatsApp Web)
- Local authentication storage
- Session management per phone number/group
- Automatic message routing to the agent runtime

## Setup

### 1. Install Dependencies

Dependencies are already included in `package.json`:
- `@whiskeysockets/baileys` - WhatsApp client
- `qrcode-terminal` - QR code display in terminal

```bash
npm install
```

### 2. Enable WhatsApp in Configuration

Edit your config file or profile to enable WhatsApp:

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["+1234567890"],
    "groups": ["*"],
    "dmPolicy": "pairing",
    "autoReconnect": true,
    "qrTimeout": 60000
  }
}
```

**Configuration Options:**
- `enabled` - Enable/disable WhatsApp integration
- `allowFrom` - Array of allowed phone numbers (use `["*"]` to allow all)
- `groups` - Array of allowed group IDs (use `["*"]` to allow all groups)
- `dmPolicy` - `"pairing"` (require approval) or `"open"` (allow all)
- `autoReconnect` - Auto-reconnect on disconnect
- `qrTimeout` - QR code timeout in milliseconds

### 3. Link Your WhatsApp Device

Run the login command to link your WhatsApp:

```bash
ff-terminal whatsapp login
```

This will display a QR code. Scan it with WhatsApp:
1. Open WhatsApp on your phone
2. Tap Menu → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code

Authentication credentials are stored in:
```
<workspace>/whatsapp/auth/
```

### 4. Start FF-Terminal with WhatsApp

WhatsApp integration starts automatically when the daemon starts:

```bash
ff-terminal start
```

Or start the daemon directly:

```bash
ff-terminal daemon
```

If WhatsApp is enabled in your config, you'll see:
```
✓ WhatsApp integration started
```

## Usage

### Messaging the Bot

Once connected, you can send messages to FF-Terminal from WhatsApp:

**Direct Messages:**
- Send any message to start a conversation
- Each phone number gets its own session
- Conversation history is preserved

**Group Chats:**
- Add the bot's number to a group
- Send messages in the group
- Bot responds to all messages (if group is allowed)

### Special Commands

Use these commands in WhatsApp:

- `/help` - Show help message
- `/status` - Show bot status and statistics
- `/new` or `/reset` - Start a new conversation

### Pairing Mode

If `dmPolicy` is set to `"pairing"`, first-time users receive a pairing code:

```
🔐 First-time access requires approval.

Your pairing code: ABC123

Ask the bot owner to approve with:
ff-terminal whatsapp approve ABC123
```

Approve the pairing:

```bash
ff-terminal whatsapp approve ABC123
```

## CLI Commands

### Connection Management

```bash
# Link WhatsApp device
ff-terminal whatsapp login

# Disconnect and clear authentication
ff-terminal whatsapp logout

# Show connection status
ff-terminal whatsapp status

# Start WhatsApp server (development)
ff-terminal whatsapp start
```

### Access Control

```bash
# List pending pairing requests
ff-terminal whatsapp pending

# Approve a pairing request
ff-terminal whatsapp approve <code>

# Manage allowlist
ff-terminal whatsapp allowlist list
ff-terminal whatsapp allowlist add +1234567890
ff-terminal whatsapp allowlist remove +1234567890
```

### Help

```bash
# Show all WhatsApp commands
ff-terminal whatsapp help
```

## File Structure

```
src/whatsapp/
├── index.ts              # Module exports
├── types.ts              # TypeScript type definitions
├── whatsappClient.ts     # Baileys client wrapper
├── whatsappServer.ts     # Main server integration
├── authState.ts          # Authentication management
├── pairingManager.ts     # Pairing code management
├── sessionManager.ts     # Session/conversation tracking
├── messageHandler.ts     # Message routing and formatting
└── cli.ts               # CLI command handlers

<workspace>/whatsapp/
├── auth/                # Authentication credentials
├── sessions.json        # Session mappings
├── pairings.json        # Pairing requests
└── allowlist.json       # Approved phone numbers
```

## Features

### Session Management
- Each phone number/group gets a unique session ID
- Conversation history persists across daemon restarts
- Sessions auto-clean after 7 days of inactivity

### Message Handling
- Long messages are automatically split into chunks
- Typing indicators show bot is processing
- Streaming responses collected before sending
- Error handling with user-friendly messages

### Security
- Device authentication (like WhatsApp Web)
- Pairing codes for new users
- Allowlist-based access control
- Group allowlist support
- Credentials stored locally

### Auto-Cleanup
- Old pairing requests (24 hours)
- Inactive sessions (7 days)
- Runs every 6 hours automatically

## Development

### Testing

Start WhatsApp server in standalone mode:

```bash
ff-terminal whatsapp start
```

### Debugging

Enable debug logs:

```bash
FF_DEBUG=true ff-terminal start
```

### Architecture

Messages flow through this pipeline:

```
WhatsApp Message
  ↓
Baileys Client (whatsappClient.ts)
  ↓
Message Handler (messageHandler.ts)
  ↓
Session Manager (get/create session)
  ↓
Agent Runtime (runAgentTurn)
  ↓
Stream Chunks → Format
  ↓
Response → WhatsApp
```

## Troubleshooting

### QR Code Won't Scan

- Make sure you're using WhatsApp (not WhatsApp Business)
- Try running `ff-terminal whatsapp logout` then `login` again
- Check QR code timeout setting

### Not Receiving Messages

- Verify WhatsApp is enabled: `ff-terminal whatsapp status`
- Check if sender is in allowlist
- Check pairing requests: `ff-terminal whatsapp pending`
- Verify daemon is running

### Connection Drops

- Enable auto-reconnect in config
- Check internet connection
- Review daemon logs for errors

### Phone Number Not Allowed

Add to config allowlist:
```json
{
  "whatsapp": {
    "allowFrom": ["+1234567890", "+0987654321"]
  }
}
```

Or use pairing mode to approve dynamically.

## Limitations

- Requires active internet connection
- WhatsApp device must stay online
- No support for WhatsApp Business API
- Media messages (images/videos) extract captions only
- Voice messages not supported

## Security Considerations

- Authentication credentials stored in plaintext in workspace
- Consider workspace directory permissions
- Use pairing mode for unknown senders
- Review allowlist regularly
- Monitor pending pairing requests

## Examples

### Basic Configuration

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["+1234567890"],
    "dmPolicy": "pairing"
  }
}
```

### Open Access (Development)

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["*"],
    "dmPolicy": "open"
  }
}
```

### Group Only

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": [],
    "groups": ["123456789@g.us"],
    "dmPolicy": "pairing"
  }
}
```

## Future Enhancements

Potential improvements:
- Media file support (images, documents)
- Voice message transcription
- Rich message formatting
- Interactive buttons
- Group admin commands
- Message reactions
- Broadcast lists

## Credits

Built with:
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- Inspired by earlier gateway-first bot designs
