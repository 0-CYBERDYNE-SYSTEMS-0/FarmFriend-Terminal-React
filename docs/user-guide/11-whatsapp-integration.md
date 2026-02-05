# WhatsApp Integration

**Interact with FF Terminal via WhatsApp**

---

## Overview

The WhatsApp integration allows you to send messages to FF Terminal from WhatsApp and receive AI responses directly in your chats. It supports direct messages, group chats, pairing approval, and access control.

---

## Architecture

The integration uses:
- **Baileys** - TypeScript WhatsApp Web client library
- **Device linking** - Like WhatsApp Web
- **Local authentication** - Stored in workspace
- **Session management** - Per phone number/group
- **Automatic message routing** - To the agent runtime

---

## Setup

### Prerequisites

```bash
# Verify dependencies are installed
npm install
```

### Enable WhatsApp

Edit your configuration file (`~/.config/ff-terminal/config.json`):

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

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable/disable WhatsApp integration | `false` |
| `allowFrom` | Array of allowed phone numbers | `[]` |
| `groups` | Array of allowed group IDs | `[]` |
| `dmPolicy` | `"pairing"` (require approval) or `"open"` (allow all) | `"pairing"` |
| `autoReconnect` | Auto-reconnect on disconnect | `true` |
| `qrTimeout` | QR code timeout in milliseconds | `60000` |

---

## Linking Your Device

### Start Login

```bash
ff-terminal whatsapp login
```

This displays a QR code in the terminal.

### Scan QR Code

1. Open WhatsApp on your phone
2. Tap Menu (⋯) → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code shown in the terminal

### Authentication Storage

Credentials are stored in:
```
<workspace>/whatsapp/auth/
```

### Successful Connection

Once linked, you'll see:
```
✓ WhatsApp connected successfully
Phone: +1234567890
Session: active
```

---

## Starting WhatsApp

### Automatic Start

WhatsApp integration starts automatically when the daemon starts:

```bash
ff-terminal start
```

Output:
```
✓ WhatsApp integration started
```

### Manual Start

Start the WhatsApp server independently:

```bash
ff-terminal whatsapp start
```

### Verify Connection

```bash
ff-terminal whatsapp status
```

**Output:**
```
WhatsApp Status:
• Status: Connected
• Phone: +1234567890
• Last Active: 2026-02-02 18:00:00 CST
• Sessions: 5 active
• Pending Pairings: 2
```

---

## Usage

### Direct Messages

Send messages to FF Terminal from WhatsApp:

```
You: Can you help me with my project?
FF Terminal: Of course! What would you like help with?
```

Each phone number gets its own session:
- Conversation history is preserved
- Context carries between messages
- Sessions persist across daemon restarts

### Group Chats

Add FF Terminal to a group chat:

1. Open WhatsApp group settings
2. Add FF Terminal's phone number
3. Send messages in the group

**Configuration:**
```json
{
  "whatsapp": {
    "groups": ["*"]  // Allow all groups
  }
}
```

### Special Commands

In WhatsApp, use these commands:

| Command | Description |
|---------|-------------|
| `/help` | Show help message |
| `/status` | Show bot status |
| `/new` | Start new conversation |
| `/reset` | Reset conversation |

---

## Pairing Mode

If `dmPolicy` is set to `"pairing"`, new users must be approved.

### First-Time User Flow

1. User sends a message
2. User receives pairing code:

```
🔐 First-time access requires approval.

Your pairing code: ABC123

Ask the bot owner to approve with:
ff-terminal whatsapp approve ABC123
```

3. Owner approves the pairing (see below)

### Approve Pairing

```bash
ff-terminal whatsapp approve ABC123
```

**Output:**
```
✓ User +1234567890 approved
```

### View Pending Pairings

```bash
ff-terminal whatsapp pending
```

**Output:**
```
Pending Pairings:
• ABC123 - +1234567890 (2 minutes ago)
• DEF456 - +0987654321 (5 minutes ago)
```

### Deny Pairing

```bash
ff-terminal whatsapp deny GHI789
```

---

## Access Control

### Allowlist Management

Add phone numbers to the allowlist:

```bash
ff-terminal whatsapp allowlist add +1234567890
ff-terminal whatsapp allowlist add +0987654321
```

Remove from allowlist:

```bash
ff-terminal whatsapp allowlist remove +1234567890
```

View allowlist:

```bash
ff-terminal whatsapp allowlist list
```

### Configuration Allowlist

Add to config file:

```json
{
  "whatsapp": {
    "allowFrom": ["+1234567890", "+0987654321"]
  }
}
```

### Open Access (Development)

```json
{
  "whatsapp": {
    "allowFrom": ["*"],
    "dmPolicy": "open"
  }
}
```

---

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
ff-terminal whatsapp approve ABC123

# Deny a pairing request
ff-terminal whatsapp deny ABC123

# Manage allowlist
ff-terminal whatsapp allowlist list
ff-terminal whatsapp allowlist add +1234567890
ff-terminal whatsapp allowlist remove +1234567890
```

### Help

```bash
ff-terminal whatsapp help
```

---

## Session Management

### Session Storage

Sessions are stored in:

```
<workspace>/whatsapp/
├── auth/                  # Authentication credentials
├── sessions.json          # Session mappings
├── pairings.json          # Pairing requests
└── allowlist.json         # Approved phone numbers
```

### Session Structure

```json
{
  "phone": "+1234567890",
  "sessionId": "session-abc123",
  "createdAt": "2026-02-02T18:00:00Z",
  "lastActive": "2026-02-02T18:30:00Z",
  "messageCount": 25
}
```

### Auto-Cleanup

- **Pairing requests:** Removed after 24 hours
- **Inactive sessions:** Removed after 7 days
- **Cleanup runs:** Every 6 hours automatically

---

## Message Handling

### Long Messages

Long messages are automatically:
- Split into chunks if too long
- Reassembled for the agent
- Delivered as a single message to user

### Streaming Responses

AI responses stream to the user:
- Shows "typing" indicator while processing
- Delivers response when complete
- Supports markdown formatting

### Error Handling

Errors are converted to user-friendly messages:

```
Sorry, I encountered an error. Please try again.
(Internal: Tool execution timeout)
```

---

## Security

### Authentication

- Device authentication (like WhatsApp Web)
- Credentials stored locally
- No cloud dependency

### Access Control

- Pairing codes for new users
- Allowlist-based access control
- Group allowlist support
- Per-session isolation

### Best Practices

- Use pairing mode for unknown senders
- Review allowlist regularly
- Monitor pending pairings
- Consider workspace permissions

---

## Troubleshooting

### QR Code Won't Scan

1. Make sure you're using WhatsApp (not WhatsApp Business)
2. Try:

```bash
ff-terminal whatsapp logout
ff-terminal whatsapp login
```

3. Check QR code timeout setting

### Not Receiving Messages

```bash
# Verify WhatsApp is enabled
ff-terminal whatsapp status

# Check if sender is in allowlist
ff-terminal whatsapp allowlist list

# Check pairing requests
ff-terminal whatsapp pending

# Verify daemon is running
ff-terminal daemon status
```

### Connection Drops

1. Enable auto-reconnect in config
2. Check internet connection
3. Review daemon logs:

```bash
cat <workspace>/logs/whatsapp/*.jsonl
```

### Phone Number Not Allowed

Add to allowlist:

```bash
ff-terminal whatsapp allowlist add +1234567890
```

Or update config:

```json
{
  "whatsapp": {
    "allowFrom": ["+1234567890"]
  }
}
```

---

## Limitations

| Limitation | Description |
|------------|-------------|
| Internet connection | Requires active internet |
| Device online | WhatsApp device must stay online |
| WhatsApp Business | Not supported |
| Media messages | Extracts captions only |
| Voice messages | Not supported |

---

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

---

## Debugging

### Enable Debug Logs

```bash
FF_DEBUG=true ff-terminal start
```

### View WhatsApp Logs

```bash
# Real-time logs
tail -f <workspace>/logs/whatsapp/*.jsonl

# Search for errors
grep "error" <workspace>/logs/whatsapp/*.jsonl
```

### Check Session Status

```bash
ff-terminal whatsapp status
```

---

## Examples

### Basic Configuration (Development)

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["*"],
    "dmPolicy": "open"
  }
}
```

### Secure Configuration (Production)

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": ["+1234567890", "+0987654321"],
    "groups": ["123456789@g.us"],
    "dmPolicy": "pairing",
    "autoReconnect": true
  }
}
```

### Group-Only Configuration

```json
{
  "whatsapp": {
    "enabled": true,
    "allowFrom": [],
    "groups": ["123456789@g.us", "987654321@g.us"],
    "dmPolicy": "pairing"
  }
}
```

---

## Best Practices

### For Development

- Use `"dmPolicy": "open"` for testing
- Use `"allowFrom": ["*"]` for easy testing
- Monitor logs during development
- Test with multiple devices

### For Production

- Use `"dmPolicy": "pairing"` for unknown senders
- Maintain allowlist of approved numbers
- Review pending pairings regularly
- Enable `autoReconnect`
- Monitor session activity

### For Security

- Use pairing mode by default
- Review allowlist monthly
- Rotate credentials periodically
- Log all access attempts

---

## Future Enhancements

Potential future features:
- Media file support (images, documents)
- Voice message transcription
- Rich message formatting
- Interactive buttons
- Group admin commands
- Message reactions
- Broadcast lists

---

## Next Steps

1. **[Configuration Guide](12-configuration-guide.md)** - Complete configuration reference
2. **[Architecture Overview](../architecture/01-file-structure.md)** - System architecture
3. **[API Reference](../api/01-tools-complete-reference.md)** - Tool reference

---

**Built with technical precision and agentic intelligence**
