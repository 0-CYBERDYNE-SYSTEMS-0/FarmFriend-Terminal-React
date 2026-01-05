# Mail Tool Specification

## Overview

The `mail` tool provides secure, privacy-first email operations for macOS Mail.app with optional local PII (Personally Identifiable Information) processing via maclocal-api. All sensitive email content processing happens on-device using Apple's Foundation Models, ensuring that private information never leaves your machine.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FarmFriend Terminal                       │
│                     (Agent Runtime)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Calls mail tool
                 │
┌────────────────▼────────────────────────────────────────────┐
│                      Mail Tool                               │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │   AppleScript    │         │   maclocal-api       │     │
│  │   Automation     │         │   (Local LLM)        │     │
│  │                  │         │                      │     │
│  │ • Search emails  │         │ • PII detection      │     │
│  │ • Read content   │         │ • Redaction          │     │
│  │ • Compose/send   │         │ • Summarization      │     │
│  │ • Edit drafts    │         │ • Sentiment analysis │     │
│  │ • Archive        │         │ • Priority scoring   │     │
│  └──────────────────┘         └──────────────────────┘     │
│         │                              │                    │
│         │                              │                    │
└─────────┼──────────────────────────────┼────────────────────┘
          │                              │
          │                              │
┌─────────▼──────────────────┐  ┌───────▼────────────────────┐
│    macOS Mail.app          │  │  maclocal-api Server       │
│                            │  │  (http://localhost:8080)   │
│  • Email storage           │  │                            │
│  • SMTP/IMAP               │  │  • Apple Foundation Model  │
│  • Mailbox management      │  │  • OpenAI-compatible API   │
│  • Account configuration   │  │  • 100% on-device         │
└────────────────────────────┘  └────────────────────────────┘
```

## Privacy & Security Features

### 1. Local-First Processing
- All email operations use macOS Mail.app's native APIs via AppleScript
- No cloud services required for basic email operations
- Email content never sent to remote servers without explicit user action

### 2. On-Device PII Processing
- Optional integration with maclocal-api for PII detection and redaction
- Uses Apple's Foundation Models running locally on your Mac
- PII processing happens entirely on-device - no data transmission
- Supports automatic redaction of:
  - Email addresses
  - Phone numbers
  - Physical addresses
  - Social Security numbers
  - Credit card numbers
  - Account numbers
  - Names in sensitive contexts

### 3. Privacy Controls
- `pii_redact` flag enables automatic redaction when reading emails
- `include_body` flag allows limiting data exposure in search results
- All AI analysis uses local LLM only (requires maclocal-api)

## Installation & Setup

### Prerequisites

1. **macOS** (required)
2. **Mail.app** configured with at least one email account
3. **maclocal-api** (optional, for PII processing and AI features)

### Installing maclocal-api

```bash
# Clone the repository
git clone https://github.com/scouzi1966/maclocal-api.git
cd maclocal-api

# Follow the project's installation instructions
# Typically involves building the Swift project and starting the server

# Start the server (default port 8080)
./afm server
```

### Configuration

Set environment variables in your FarmFriend profile or shell:

```bash
# maclocal-api endpoint (optional, defaults to http://localhost:8080)
export MACLOCAL_API_URL="http://localhost:8080/v1/chat/completions"

# API key (optional, defaults to "local-key")
export MACLOCAL_API_KEY="local-key"
```

## Tool Specification

### Tool Name
`mail`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | ✓ | Action to perform (see Actions section) |
| `message_id` | string | conditional | Email message ID (required for read, archive, move) |
| `sender` | string | | Filter by sender address or name (search) |
| `subject` | string | | Email subject (search filter or compose/draft) |
| `recipient` | string | conditional | Recipient address (required for compose/draft) |
| `body` | string | | Email body content (compose/draft/edit/analyze) |
| `query` | string | | Analysis type (analyze action) |
| `mailbox` | string | | Mailbox name (search filter or move target) |
| `limit` | number | | Max search results (default: 10) |
| `include_body` | boolean | | Include body in search (default: false) |
| `pii_redact` | boolean | | Auto-redact PII when reading (default: false) |
| `date_from` | string | | Filter from date (ISO 8601) |
| `date_to` | string | | Filter until date (ISO 8601) |
| `draft_id` | string | conditional | Draft ID (required for edit_draft) |
| `attachment_paths` | array[string] | | File paths to attach (compose/send) |

## Actions

### 1. Search Emails

Find emails matching specified criteria.

**Action:** `search`

**Parameters:**
- `sender` (optional): Filter by sender
- `subject` (optional): Filter by subject keywords
- `mailbox` (optional): Search in specific mailbox
- `limit` (optional): Maximum results (default: 10)
- `include_body` (optional): Include email body (default: false)
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter

**Example:**
```json
{
  "action": "search",
  "sender": "boss@company.com",
  "subject": "quarterly report",
  "mailbox": "INBOX",
  "limit": 5
}
```

**Response:**
```json
{
  "ok": true,
  "action": "search",
  "messages": [
    {
      "id": "msg-12345",
      "subject": "Q4 Quarterly Report",
      "sender": "boss@company.com",
      "recipients": ["me@company.com"],
      "date": "2024-01-15T10:30:00Z",
      "read_status": false,
      "snippet": "Please review the attached...",
      "mailbox": "INBOX"
    }
  ],
  "count": 1
}
```

### 2. Read Email

Read a specific email with optional PII redaction.

**Action:** `read`

**Parameters:**
- `message_id` (required): Email message ID
- `pii_redact` (optional): Enable PII redaction (default: false)

**Example:**
```json
{
  "action": "read",
  "message_id": "msg-12345",
  "pii_redact": true
}
```

**Response:**
```json
{
  "ok": true,
  "action": "read",
  "message": {
    "id": "msg-12345",
    "subject": "Q4 Quarterly Report",
    "sender": "boss@company.com",
    "recipients": ["me@company.com"],
    "date": "2024-01-15T10:30:00Z",
    "read_status": true,
    "body": "Hi [REDACTED: name],\n\nPlease review the report by [REDACTED: phone] or [REDACTED: email]..."
  }
}
```

### 3. Compose/Send Email

Create and send a new email.

**Action:** `compose` or `send`

**Parameters:**
- `recipient` (required): Email address of recipient
- `subject` (required): Email subject
- `body` (optional): Email body content
- `attachment_paths` (optional): Array of file paths to attach

**Example:**
```json
{
  "action": "send",
  "recipient": "colleague@company.com",
  "subject": "Meeting Notes",
  "body": "Here are the notes from today's meeting...",
  "attachment_paths": ["/Users/me/Documents/notes.pdf"]
}
```

**Response:**
```json
{
  "ok": true,
  "action": "send",
  "status": "Email sent successfully to colleague@company.com"
}
```

### 4. Create Draft

Create a draft email without sending.

**Action:** `create_draft`

**Parameters:**
- `recipient` (required): Email address
- `subject` (required): Email subject
- `body` (optional): Email body

**Example:**
```json
{
  "action": "create_draft",
  "recipient": "client@example.com",
  "subject": "Proposal Follow-up",
  "body": "Thank you for considering our proposal..."
}
```

**Response:**
```json
{
  "ok": true,
  "action": "create_draft",
  "status": "Draft created with ID: draft-67890"
}
```

### 5. Edit Draft

Modify an existing draft email.

**Action:** `edit_draft`

**Parameters:**
- `draft_id` (required): Draft message ID
- `subject` (optional): New subject
- `body` (optional): New body content

**Example:**
```json
{
  "action": "edit_draft",
  "draft_id": "draft-67890",
  "body": "Updated body content..."
}
```

### 6. Archive/Move Email

Move email to a specific mailbox (archive, folder, etc.).

**Action:** `archive` or `move`

**Parameters:**
- `message_id` (required): Email message ID
- `mailbox` (optional): Target mailbox (default: "Archive")

**Example:**
```json
{
  "action": "archive",
  "message_id": "msg-12345",
  "mailbox": "Archive"
}
```

### 7. Analyze Email

AI-powered analysis of email content using local LLM.

**Action:** `analyze`

**Parameters:**
- `message_id` or `body` (required): Email to analyze
- `query` (optional): Analysis type - `summary`, `sentiment`, `action_items`, `priority`, `category` (default: summary)

**Example:**
```json
{
  "action": "analyze",
  "message_id": "msg-12345",
  "query": "action_items"
}
```

**Response:**
```json
{
  "ok": true,
  "action": "analyze",
  "analysis": "Action items identified:\n1. Review Q4 report by Friday\n2. Schedule follow-up meeting\n3. Prepare budget estimates"
}
```

### 8. Redact PII

Extract and redact personally identifiable information from text.

**Action:** `redact_pii`

**Parameters:**
- `message_id` or `body` (required): Content to redact

**Example:**
```json
{
  "action": "redact_pii",
  "body": "Contact John Doe at john@example.com or call 555-1234. Address: 123 Main St."
}
```

**Response:**
```json
{
  "ok": true,
  "action": "redact_pii",
  "redacted_text": "Contact [REDACTED: name] at [REDACTED: email] or call [REDACTED: phone]. Address: [REDACTED: address]."
}
```

## Use Cases

### 1. Privacy-Conscious Email Review
```json
{
  "action": "read",
  "message_id": "msg-sensitive-123",
  "pii_redact": true
}
```
Read emails with automatic PII redaction for safe sharing or screen recording.

### 2. Email Triage with AI
```json
{
  "action": "analyze",
  "message_id": "msg-unknown-456",
  "query": "priority"
}
```
Let local AI assess email priority to help manage your inbox.

### 3. Smart Email Search
```json
{
  "action": "search",
  "sender": "important-client@example.com",
  "date_from": "2024-01-01",
  "limit": 20
}
```
Find all emails from a specific sender within a date range.

### 4. Automated Email Composition
```json
{
  "action": "send",
  "recipient": "team@company.com",
  "subject": "Weekly Update",
  "body": "This week's accomplishments: ...",
  "attachment_paths": ["/path/to/report.pdf"]
}
```
Compose and send emails with attachments programmatically.

### 5. Extract Action Items
```json
{
  "action": "analyze",
  "message_id": "msg-meeting-notes",
  "query": "action_items"
}
```
Use local AI to extract tasks and to-dos from email threads.

## Error Handling

The tool returns structured error information:

```json
{
  "ok": false,
  "action": "read",
  "error": "Failed to read email: message not found"
}
```

Common error scenarios:
- **Platform check**: Tool only works on macOS
- **Missing Mail.app**: Requires configured Mail.app
- **Invalid message_id**: Email doesn't exist
- **maclocal-api unavailable**: PII/analysis features disabled with warning
- **Permission denied**: AppleScript access blocked (check System Preferences)

## Permissions

### Required macOS Permissions
1. **Automation Access**: Allow Terminal (or FarmFriend) to control Mail.app
   - System Preferences → Security & Privacy → Privacy → Automation
   - Enable access for your terminal application

2. **Full Disk Access** (may be required):
   - System Preferences → Security & Privacy → Privacy → Full Disk Access

### First-Time Setup
When first running the tool, macOS will prompt you to grant permissions. Click "OK" to allow automation access to Mail.app.

## Best Practices

### 1. Privacy
- Use `pii_redact: true` when reading emails that may contain sensitive information
- Keep `include_body: false` in searches unless body content is needed
- All AI processing stays local when using maclocal-api

### 2. Performance
- Set appropriate `limit` values for searches to avoid overwhelming results
- Use specific search filters (sender, subject, mailbox) to narrow results
- Disable `include_body` for faster search operations

### 3. Reliability
- Check message_id validity before performing operations
- Handle cases where maclocal-api may not be running (tool gracefully degrades)
- Use draft workflow for important emails (create → review → send)

### 4. Security
- Never log or store email content in plain text files
- Use PII redaction before sharing email content
- Leverage local LLM processing to avoid cloud exposure

## Troubleshooting

### Tool returns "only supported on macOS"
- This tool requires macOS and won't work on Linux or Windows
- Consider alternative tools for cross-platform email automation

### AppleScript permission denied
1. Open System Preferences → Security & Privacy → Privacy
2. Navigate to Automation
3. Find your terminal app and enable Mail.app access

### maclocal-api warnings
- `[Warning: maclocal-api not available...]` means the server isn't running
- Install and start maclocal-api to enable PII/analysis features
- Basic email operations (search, read, send) work without maclocal-api

### Mail.app not responding
- Ensure Mail.app is installed and configured with at least one account
- Try opening Mail.app manually to verify it's working
- Check for macOS updates that may affect AppleScript

## Integration with FarmFriend

### Skill Integration
The mail tool can be used within FarmFriend skills for email automation:

```yaml
name: Email Assistant
description: Helps manage email inbox with AI-powered insights
tools:
  - mail
  - think
```

### Agent Workflow
Create custom agents that leverage the mail tool:
- Email summarization agent
- Priority inbox agent
- PII scanner agent
- Auto-responder agent

### Example Agent Flow
1. Search for unread emails
2. Analyze each for priority
3. Summarize high-priority items
4. Draft responses for common queries
5. Present summary to user

## Future Enhancements

Potential future additions:
- **Bulk operations**: Process multiple emails at once
- **Smart filters**: ML-based email categorization
- **Calendar integration**: Extract meeting invites
- **Contact management**: Sync with Contacts.app
- **Email templates**: Reusable composition templates
- **Threading**: Track conversation threads
- **Advanced search**: Full-text search with Boolean operators
- **Email rules**: Automated filtering and organization

## Contributing

To extend the mail tool:
1. Edit `src/runtime/tools/implementations/mail.ts`
2. Update schema in `packet/tool_schemas.openai.json`
3. Test with both maclocal-api enabled and disabled
4. Ensure privacy-first design principles
5. Document new features in this file

## References

- [maclocal-api GitHub](https://github.com/scouzi1966/maclocal-api)
- [Apple MailKit Documentation](https://developer.apple.com/documentation/mailkit)
- [macOS AppleScript Mail Suite](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html)
- [Apple Privacy Guidelines](https://developer.apple.com/design/human-interface-guidelines/privacy)

## License

This tool is part of FarmFriend Terminal and follows the same license as the main project.
