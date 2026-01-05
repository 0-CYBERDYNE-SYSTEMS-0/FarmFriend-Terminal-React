# Mail Tool - Usage Examples

This document provides practical examples for using the mail tool in FarmFriend Terminal.

## Prerequisites

1. **macOS** with Mail.app configured
2. **FarmFriend Terminal** installed and running
3. **maclocal-api** (optional, for PII and AI features)
   - Install from: https://github.com/scouzi1966/maclocal-api
   - Start server: `./afm server`

## Basic Examples

### 1. Search for Recent Emails

Search for emails from a specific sender:

```
Please search my mail for emails from john@example.com
```

Behind the scenes, this uses:
```json
{
  "action": "search",
  "sender": "john@example.com",
  "limit": 10
}
```

### 2. Search with Multiple Filters

Find emails with specific subject in a mailbox:

```
Find emails in my INBOX with "quarterly report" in the subject
```

Tool call:
```json
{
  "action": "search",
  "subject": "quarterly report",
  "mailbox": "INBOX",
  "limit": 10
}
```

### 3. Read an Email Safely

Read an email with automatic PII redaction:

```
Read email message msg-12345 with PII redaction enabled
```

Tool call:
```json
{
  "action": "read",
  "message_id": "msg-12345",
  "pii_redact": true
}
```

### 4. Compose and Send Email

Send a new email:

```
Send an email to alice@company.com with subject "Meeting Follow-up" 
and body "Thanks for the productive meeting today. Here are the action items..."
```

Tool call:
```json
{
  "action": "send",
  "recipient": "alice@company.com",
  "subject": "Meeting Follow-up",
  "body": "Thanks for the productive meeting today. Here are the action items..."
}
```

### 5. Send Email with Attachment

Send email with a file attached:

```
Send email to bob@example.com with subject "Report" and attach /Users/me/Documents/report.pdf
```

Tool call:
```json
{
  "action": "send",
  "recipient": "bob@example.com",
  "subject": "Report",
  "body": "Please find the report attached.",
  "attachment_paths": ["/Users/me/Documents/report.pdf"]
}
```

## AI-Powered Features

### 6. Summarize an Email

Get an AI summary of email content:

```
Summarize email msg-67890 for me
```

Tool call:
```json
{
  "action": "analyze",
  "message_id": "msg-67890",
  "query": "summary"
}
```

### 7. Extract Action Items

Find tasks mentioned in an email:

```
Extract action items from email msg-67890
```

Tool call:
```json
{
  "action": "analyze",
  "message_id": "msg-67890",
  "query": "action_items"
}
```

### 8. Assess Email Priority

Let AI determine email importance:

```
Analyze the priority level of email msg-67890
```

Tool call:
```json
{
  "action": "analyze",
  "message_id": "msg-67890",
  "query": "priority"
}
```

### 9. Sentiment Analysis

Understand the tone of an email:

```
What's the sentiment of email msg-67890?
```

Tool call:
```json
{
  "action": "analyze",
  "message_id": "msg-67890",
  "query": "sentiment"
}
```

### 10. Categorize Email

Automatically categorize an email:

```
Categorize email msg-67890
```

Tool call:
```json
{
  "action": "analyze",
  "message_id": "msg-67890",
  "query": "category"
}
```

## Privacy Features

### 11. Redact PII from Text

Remove sensitive information from email content:

```
Redact PII from this email text: "Contact John Smith at john@example.com or call 555-1234"
```

Tool call:
```json
{
  "action": "redact_pii",
  "body": "Contact John Smith at john@example.com or call 555-1234"
}
```

Response:
```
Contact [REDACTED: name] at [REDACTED: email] or call [REDACTED: phone]
```

### 12. Safe Email Review

Read and redact email in one step:

```
Read email msg-sensitive-123 with PII protection enabled
```

Tool call:
```json
{
  "action": "read",
  "message_id": "msg-sensitive-123",
  "pii_redact": true
}
```

## Draft Management

### 13. Create a Draft

Create an email draft without sending:

```
Create a draft email to team@company.com with subject "Weekly Update"
```

Tool call:
```json
{
  "action": "create_draft",
  "recipient": "team@company.com",
  "subject": "Weekly Update",
  "body": "Team,\n\nHere's what we accomplished this week..."
}
```

### 14. Edit Existing Draft

Modify a draft email:

```
Edit draft draft-12345 to change the body to "Updated content here..."
```

Tool call:
```json
{
  "action": "edit_draft",
  "draft_id": "draft-12345",
  "body": "Updated content here..."
}
```

## Organization

### 15. Archive an Email

Move email to Archive mailbox:

```
Archive email msg-12345
```

Tool call:
```json
{
  "action": "archive",
  "message_id": "msg-12345"
}
```

### 16. Move to Custom Mailbox

Move email to a specific folder:

```
Move email msg-12345 to Projects mailbox
```

Tool call:
```json
{
  "action": "move",
  "message_id": "msg-12345",
  "mailbox": "Projects"
}
```

## Advanced Workflows

### 17. Email Triage Workflow

Ask the agent to help prioritize your inbox:

```
Search my inbox for unread emails, analyze their priority, 
and summarize the high-priority ones
```

This would trigger multiple tool calls:
1. Search for unread emails
2. For each email, analyze priority
3. For high-priority emails, generate summaries

### 18. Smart Response Generation

Have the agent draft responses:

```
Read email msg-12345, analyze its content, and create a draft response 
addressing the key points
```

Workflow:
1. Read the email
2. Analyze for main points
3. Generate appropriate response
4. Create draft with response

### 19. Bulk Email Processing

Process multiple emails:

```
Find all emails from client@example.com from last week, 
extract action items from each, and create a summary
```

Workflow:
1. Search emails with date filter
2. For each result, extract action items
3. Compile consolidated summary

### 20. Privacy-First Review

Review sensitive emails safely:

```
Search emails about "salary" and read them with PII redaction, 
then summarize the key information
```

Workflow:
1. Search for keyword
2. Read with PII redaction
3. Generate summary from redacted content

## Integration with Skills

### 21. Email Automation Skill

Create a skill that uses the mail tool:

```yaml
# skills/email-assistant/SKILL.md
name: Email Assistant
description: Automates email management with AI
tools:
  - mail
  - think

workflow:
  - Search inbox for unread emails
  - Analyze priority of each
  - Generate summary report
  - Archive low-priority items
```

### 22. Customer Support Automation

```yaml
# skills/support-responder/SKILL.md
name: Support Responder
description: Drafts responses to support emails
tools:
  - mail
  - ask_oracle

workflow:
  - Search for support emails
  - Analyze customer query
  - Draft appropriate response
  - Create draft for review
```

## Environment Variables

Configure maclocal-api connection:

```bash
# In your shell profile or .env
export MACLOCAL_API_URL="http://localhost:8080/v1/chat/completions"
export MACLOCAL_API_KEY="local-key"
```

## Troubleshooting

### Permission Denied

If you get permission errors:

1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Go to **Automation**
3. Find your terminal app
4. Enable **Mail.app** access

### maclocal-api Not Available

If you see warnings about maclocal-api:

```
[Warning: maclocal-api not available for PII processing...]
```

This means:
- Basic email operations (search, read, send) still work
- PII redaction and AI analysis features are unavailable
- Install maclocal-api to enable these features

### Mail.app Not Configured

Ensure Mail.app is set up:

1. Open **Mail.app**
2. Add at least one email account
3. Verify you can send/receive emails manually

## Best Practices

### Privacy
- Always use `pii_redact: true` when handling sensitive emails
- Keep analysis results local (they never leave your machine with maclocal-api)
- Don't log or screenshot unredacted PII content

### Performance
- Use `limit` parameter to control search result size
- Set `include_body: false` for faster searches when body isn't needed
- Specific mailbox filters improve search speed

### Reliability
- Create drafts first, review, then send for important emails
- Check message IDs are valid before operations
- Handle cases where maclocal-api might be unavailable

### Security
- Don't commit email content to version control
- Use environment variables for configuration
- Leverage local LLM processing to avoid cloud exposure

## More Information

- **Full Specification**: See `docs/MAIL_TOOL_SPEC.md`
- **maclocal-api**: https://github.com/scouzi1966/maclocal-api
- **Apple Mail Scripting**: https://developer.apple.com/documentation/mailkit

## Contributing Examples

Have a great use case? Add it here or create a skill that demonstrates it!
