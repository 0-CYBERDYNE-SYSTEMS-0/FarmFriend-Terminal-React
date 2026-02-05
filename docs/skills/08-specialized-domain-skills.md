# Specialized Domain Skills

> **Domain-specific tools for productivity and data management**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Specialized domain skills address specific use cases including password management, note-taking, email, reminders, and smart home control. These skills integrate FF Terminal with everyday tools.

### Skills in This Category

| Skill | Purpose | Platform |
|-------|---------|----------|
| `1password` | Password and secret management | 1Password |
| `himalaya` | Email management via IMAP/SMTP | Cross-platform |
| `apple-notes` | Apple Notes integration | macOS |
| `apple-reminders` | Apple Reminders integration | macOS |

---

## 1password

### Purpose
Access and manage passwords, secrets, and secure notes from 1Password. Retrieve credentials, generate passwords, and manage 2FA codes.

### Installation

```bash
# 1Password CLI
brew install 1password-cli
# or
brew install 1password/tap/op

# Sign in
op signin
```

### Usage

```bash
# List vaults
op vault list

# List items in vault
op item list --vault Personal

# Get item (password, note, or all)
op item get "GitHub" --format json
op item get "Server SSH" --fields password

# Get specific field
op item get "AWS" --fields "AWS Access Key ID"
op item get "AWS" --fields "AWS Secret Access Key"

# Search
op item list --query "github"

# Create new item
op item create --title "New Login" --username "user@example.com" --password "$(openssl rand -base64 16)"
```

### Common Commands

**Get credentials:**
```bash
# Password only
op item get "GitHub" --fields password

# Username and password
op item get "GitHub" --fields username,password

# All fields as JSON
op item get "GitHub" --format json

# Notes
op item get "Server Config" --fields notes
```

**Environment variables:**
```bash
# Export for current session
export OP_ITEM="op item get \"GitHub\" --fields password"
export GITHUB_PASSWORD=$(eval $OP_ITEM)

# Use in scripts
op item get "Database" --fields password | pbcopy
```

**2FA codes:**
```bash
# Get TOTP code
op item get "GitHub" --otp

# Copy TOTP to clipboard
op item get "GitHub" --otp | pbcopy
```

### Integration Examples

**Git operations:**
```bash
#!/bin/bash
# git-credentials.sh

export OP_SESSION=$(op signin --output=raw)

# Set git credential
git config credential.helper \
  '!f() { echo "username=$(op item get GitHub --fields username)"; echo "password=$(op item get GitHub --fields password)"; }; f'

unset OP_SESSION
```

**Docker registry:**
```bash
# Login to container registry
op item get "Docker Hub" --fields username
op item get "Docker Hub" --fields password | docker login --username $(username) --password-stdin
```

**SSH keys:**
```bash
# Get SSH key
op item get "SSH Key" --fields "Private Key" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa

# Add to ssh-agent
ssh-add ~/.ssh/id_rsa
```

**API keys:**
```bash
# Get API key for script
export OPENAI_API_KEY=$(op item get "OpenAI" --fields "API Key")
```

### Best Practices

1. **Use service accounts** for CI/CD (not personal credentials)
2. **Enable 2FA** on all 1Password accounts
3. **Use passkeys** where supported
4. **Audit access** - Review who has access regularly
5. **Never log credentials** - Use environment variables
6. **Use `op signin --output=raw`** for script-friendly sessions

---

## himalaya

### Purpose
CLI to manage emails via IMAP/SMTP. List, read, write, reply, forward, search, and organize emails from the terminal. Supports multiple accounts and MML (MIME Meta Language).

### Installation

```bash
brew install himalaya
```

### Configuration

```bash
# Create config directory
mkdir -p ~/.config/himalaya

# Create config file
cat > ~/.config/himalaya/config.toml <<EOF
[[accounts]]
name = "personal"
email = "you@example.com"
default = true

[accounts.imap]
host = "imap.example.com"
port = 993
timeout = 30

[accounts.smtp]
host = "smtp.example.com"
port = 587
timeout = 30

[[accounts]]
name = "work"
email = "you@company.com"

[accounts.work.imap]
host = "imap.company.com"
port = 993

[accounts.work.smtp]
host = "smtp.company.com"
port = 587
EOF
```

### Usage

```bash
# List accounts
himalaya account list

# List emails
himalaya list                     # Inbox
himalaya list --folder Sent       # Sent items
himalaya list --folder "Work/Project"  # Custom folder

# Read email
himalaya read 123                 # By number
himalaya read --uid 'ABC123'      # By UID

# Search emails
himalaya search "from:github"
himalaya search "subject:deploy"
himalaya search --folder INBOX "important"

# Send email
himalaya send --to "user@example.com" --subject "Subject" --body "Message"
himalaya send --file email.txt    # From file

# Reply to email
himalaya reply 123                # Quote original
himalaya reply --no-quote 123     # Without quote

# Forward email
himalaya forward 123 --to "user@example.com"

# Delete email
himalaya delete 123
```

### Sending Email with Attachments

```bash
# Simple text
himalaya send --to "user@example.com" --subject "Report" --body "See attached"

# With attachment
himalaya send --to "user@example.com" --subject "Report" \
  --attachment /path/to/report.pdf \
  --attachment /path/to/spreadsheet.xlsx

# HTML email
himalaya send --to "user@example.com" --subject "HTML" \
  --file email.html --format html

# MML (MIME Meta Language)
cat > email.mml <<EOF
To: user@example.com
Subject: Rich Email
Content-Type: text/html

<html>
<body>
<h1>Hello!</h1>
<p>This is an <b>HTML</b> email sent from FF Terminal.</p>
</body>
</html>
EOF
himalaya send --file email.mml
```

### Searching Emails

```bash
# By sender
himalaya search "from:github"

# By subject
himalaya search "subject:deployment"

# By date
himalaya search "since:2024-01-01"

# Combined
himalaya search "from:github subject:deploy has:attachment"

# Search specific folder
himalaya search --folder "Work/Project" "deadline"
```

### Multiple Accounts

```bash
# List emails from specific account
himalaya list --account work

# Send from specific account
himalaya send --account work --to "colleague@company.com"

# Default account is used if not specified
```

### Best Practices

1. **Use MML** for complex emails (HTML, attachments)
2. **Set up multiple accounts** for work/personal separation
3. **Search efficiently** - Use specific criteria
4. **Use `--folder`** for non-Inbox folders
5. **Set default account** for quicker commands

---

## apple-notes

### Purpose
Create, search, and manage Bear notes via grizzly CLI. Apple Notes integration for note-taking workflows.

### Installation

```bash
go install github.com/tylerwince/grizzly/cmd/grizzly@latest
```

### Usage

```bash
# List notes
grizzly list

# Search notes
grizzly search "project"
grizzly search --tags "idea"

# Create note
grizzly create "Note Title" "Note content here"

# Create note from file
grizzly create "Imported Note" --file document.md

# Get note content
grizzly get "note-id-or-title"

# Delete note
grizzly delete "note-id-or-title"

# List tags
grizzly tags

# Add tag
grizzly tag "note-id" "new-tag"

# Remove tag
grizzly untag "note-id" "old-tag"
```

### Workflows

**Capture ideas:**
```bash
# Quick note
grizzly create "Idea: AI Automation" "Could use inter-agent-communication for..."

# From clipboard
pbpaste | grizzly create "Clipboard $(date +%Y-%m-%d)"
```

**Search and retrieve:**
```bash
# Find note
grizzly search "deployment script"

# Get full content
grizzly get "deployment script" > notes/deployment.md
```

**Organize:**
```bash
# Add tags
grizzly tag "note-id" "project-alpha"
grizzly tag "note-id" "priority-high"

# List all tags
grizzly tags

# Search by tag
grizzly search --tags "project-alpha"
```

### Best Practices

1. **Use consistent tagging** - Easy to find later
2. **Create from clipboard** - Quick capture workflow
3. **Export for documentation** - Pull notes into projects
4. **Use Bear for knowledge base** - Link between notes

---

## apple-reminders

### Purpose
Manage Apple Reminders via CLI. Create, complete, list, and organize reminders across lists.

### Installation

```bash
# Part of macOS - no installation needed
# Uses AppleScript for automation
```

### Usage

```bash
# List all reminders
reminders list

# List in specific list
reminders list --list "Work"
reminders list --list "Personal"

# Add reminder
reminders add "Submit report" --list "Work" --due "2024-02-15"
reminders add "Buy groceries" --list "Personal" --due "today"

# Complete reminder
reminders complete "Submit report"
reminders complete "Buy groceries" --list "Personal"

# Delete reminder
reminders delete "Old reminder"

# Show upcoming
reminders upcoming --days 7
reminders today
```

### Options

| Option | Description |
|--------|-------------|
| `--list` | Reminder list name |
| `--due` | Due date (today, tomorrow, YYYY-MM-DD) |
| `--notes` | Additional notes |
| `--priority` | Priority (high, medium, low) |

### Workflows

**Daily standup:**
```bash
#!/bin/bash
# daily-reminders.sh

echo "Today's reminders:"
reminders today --list "Work"

echo -e "\nUpcoming this week:"
reminders upcoming --days 7 --list "Work"
```

**Add from terminal:**
```bash
# Quick add
reminders add "Deploy to production" --list "Work" --priority high

# With date
reminders add "Team meeting" --list "Work" --due "2024-02-20T14:00:00"

# With notes
reminders add "Review PR #142" --list "Work" --notes "Check security changes"
```

**Automation integration:**
```bash
#!/bin/bash
# Add reminder from script output
OUTPUT=$(python3 deploy.py 2>&1)
if echo "$OUTPUT" | grep -q "Error"; then
  reminders add "Check deployment errors" --list "Work" --due "today"
fi
```

### Best Practices

1. **Use consistent list names** - Work, Personal, Home
2. **Set due dates** - Helps prioritize
3. **Add notes** - Context for complex tasks
4. **Complete regularly** - Keep list manageable
5. **Combine with calendar** - See reminders in multiple places

---

## Workflow Examples

### Complete Productivity System

```bash
#!/bin/bash
# daily-productivity.sh

echo "=== 📋 Today's Reminders ==="
reminders today --list "Work"
reminders today --list "Personal"

echo -e "\n=== 📝 Recent Notes ==="
grizzly search --tags "today" | head -5

echo -e "\n=== 📧 Unread Emails ==="
himalaya list --folder INBOX --unread | head -10
```

### Password-Ready Automation

```bash
#!/bin/bash
# deploy.sh - Deployment with secure credentials

# Get credentials from 1Password
export OP_SESSION=$(op signin --output=raw)
export DB_PASSWORD=$(op item get "Production DB" --fields password)
export API_KEY=$(op item get "Deploy Token" --fields token)
unset OP_SESSION

# Run deployment
./deploy.sh --password "$DB_PASSWORD" --api-key "$API_KEY"

# Send notification
himalaya send --to "team@example.com" \
  --subject "Deployment Complete" \
  --body "Production deployment finished successfully."
```

### Knowledge Capture Workflow

```bash
#!/bin/bash
# capture.sh - Quick capture to Bear + Reminder

TITLE=$1
CONTENT=$2
REMINDER=$3

# Create note
grizzly create "$TITLE" "$CONTENT"

# Add tag
NOTE_ID=$(grizzly list --title "$TITLE" --format json | jq -r '.[0].id')
grizzly tag "$NOTE_ID" "inbox"

# Set reminder if requested
if [ -n "$REMINDER" ]; then
  reminders add "Review: $TITLE" --list "Inbox" --due "tomorrow" --notes "$CONTENT"
fi

echo "Captured: $TITLE"
```

---

## Specialized Domain Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Get password | `1password` | `op item get` |
| Get API key | `1password` | Export to env var |
| 2FA codes | `1password` | `op item get --otp` |
| Service accounts | `1password` | Use for CI/CD |
| List emails | `himalaya` | `himalaya list` |
| Send email | `himalaya` | `himalaya send` |
| Search emails | `himalaya` | `himalaya search` |
| Create note | `apple-notes` (grizzly) | `grizzly create` |
| Search notes | `apple-notes` | `grizzly search` |
| Manage reminders | `apple-reminders` | `reminders add/complete` |
| Daily review | All three | Script combination |

---

## Best Practices Summary

### 1Password
- Use service accounts for automation
- Never hardcode credentials
- Enable 2FA everywhere
- Audit access regularly

### Himalaya
- Configure multiple accounts
- Use MML for complex emails
- Search efficiently with filters
- Keep inbox organized

### Bear Notes (grizzly)
- Consistent tagging system
- Quick capture from clipboard
- Export for documentation
- Link related notes

### Apple Reminders
- Consistent list names
- Set due dates and priorities
- Add context in notes
- Complete tasks regularly

---

## Next Steps

- **Master 1Password CLI** - Service accounts, environment integration
- **Set up email workflows** - Multiple accounts, templates
- **Build note capture system** - Quick capture, organized storage
- **Integrate reminders** - Script automation with due dates
- **Combine all three** - Complete productivity system

---

**For complete specialized domain skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
