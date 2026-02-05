# Creating Custom Skills

> **Guide to building and publishing new FF Terminal skills**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

This guide teaches you how to create, test, and publish custom skills for FF Terminal. Skills are modular units of functionality that extend FF Terminal's capabilities.

## What Makes a Skill

A skill is a directory with:

```
skill-name/
├── SKILL.md              # Required: Documentation
├── README.md             # Optional: Quick reference
├── scripts/              # Tool scripts
│   ├── main.py           # Primary tool
│   └── utils.py          # Helpers
├── config/               # Configuration
│   └── config.yaml       # Settings
└── tests/                # Test suite (optional)
    └── test_main.py
```

### SKILL.md Structure (Required)

Every skill must have a `SKILL.md` file with frontmatter:

```yaml
---
name: skill-name
description: "Brief description of what the skill does"
homepage: https://github.com/yourusername/skill-name
metadata:
  clawdbot:
    emoji: "🔧"
    requires:
      bins: ["required-binary"]        # Required CLI tools
      env: ["ENV_VAR_NAME"]            # Environment variables
      config: ["config.key"]           # Config keys
      os: ["darwin", "linux"]          # OS constraints
    install:
      - id: brew
        kind: brew
        formula: skill-name
        label: "Install via Homebrew"
    primaryEnv: "ENV_VAR_NAME"         # Primary env var
---
```

## Step-by-Step: Creating a New Skill

### Step 1: Use the skill-creator Tool

```bash
# Create basic skill structure
skill-creator create --name my-new-skill --description "What it does"

# Create with template
skill-creator create --name api-wrapper --template api-client

# Interactive mode
skill-creator init
```

### Step 2: Edit SKILL.md

```yaml
---
name: my-new-skill
description: "A skill that does amazing things"
metadata:
  clawdbot:
    emoji: "✨"
    requires:
      bins: ["curl", "jq"]
      env: ["API_KEY"]
    install:
      - id: brew
        kind: brew
        formula: jq
        label: "Install jq (brew)"
---
```

### Step 3: Implement the Tool

**Python script example:**

```python
#!/usr/bin/env python3
"""My new skill - does amazing things."""

import argparse
import json
import subprocess
import sys

def main():
    parser = argparse.ArgumentParser(description="My new skill")
    parser.add_argument("--input", "-i", required=True, help="Input file")
    parser.add_argument("--output", "-o", help="Output file")
    parser.add_argument("--verbose", "-v", action="store_true")
    
    args = parser.parse_args()
    
    # Your logic here
    result = process_data(args.input)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
    else:
        print(json.dumps(result, indent=2))
    
    return 0

def process_data(input_file):
    """Process the input data."""
    with open(input_file) as f:
        data = json.load(f)
    
    # Transform data
    return {"processed": True, "items": len(data)}

if __name__ == "__main__":
    sys.exit(main())
```

### Step 4: Add Installation Instructions

In `SKILL.md`, document how to install dependencies:

```markdown
## Installation

### Prerequisites

- `curl` (install via `brew install curl`)
- `jq` (install via `brew install jq`)

### Setup

```bash
# Install dependencies
brew install curl jq

# Set API key
export API_KEY="your-api-key"
```
```

### Step 5: Add Usage Examples

```markdown
## Usage

```bash
# Basic usage
my-new-skill --input data.json

# With output
my-new-skill --input data.json --output result.json

# Verbose mode
my-new-skill --input data.json --verbose
```

## Examples

### Example 1: Process JSON file

```bash
my-new-skill --input input.json --output output.json
```

### Example 2: Use with piping

```bash
echo '{"items": [1,2,3]}' | my-new-skill --input -
```
```

### Step 6: Create Tests

```python
# tests/test_main.py
import pytest
from scripts.main import process_data

def test_process_data():
    """Test the main processing function."""
    result = process_data({"items": [1, 2, 3]})
    assert result["processed"] is True
    assert result["items"] == 3

def test_empty_input():
    """Test with empty input."""
    result = process_data({"items": []})
    assert result["items"] == 0
```

## Skill Templates

### Template: CLI Wrapper

For wrapping existing CLI tools:

```yaml
---
name: cli-wrapper
description: "Wrapper for existing CLI tool"
metadata:
  clawdbot:
    emoji: "🔧"
    requires:
      bins: ["underlying-tool"]
    install:
      - id: brew
        kind: brew
        formula: underlying-tool
---
```

```python
#!/usr/bin/env python3
"""Wrapper for underlying-tool."""

import subprocess
import sys

def main():
    # Call underlying tool
    result = subprocess.run(
        ["underlying-tool", "--help"],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
```

### Template: API Client

For REST API integration:

```yaml
---
name: api-client
description: "API client for Service X"
metadata:
  clawdbot:
    emoji: "🌐"
    requires:
      env: ["SERVICE_X_API_KEY"]
    primaryEnv: "SERVICE_X_API_KEY"
---
```

```python
#!/usr/bin/env python3
"""API client for Service X."""

import argparse
import os
import requests

API_BASE = "https://api.service-x.com/v1"

def main():
    parser = argparse.ArgumentParser(description="Service X API Client")
    parser.add_argument("--endpoint", "-e", required=True)
    parser.add_argument("--method", "-m", default="GET")
    parser.add_argument("--data", "-d", help="JSON data")
    
    args = parser.parse_args()
    
    api_key = os.environ.get("SERVICE_X_API_KEY")
    headers = {"Authorization": f"Bearer {api_key}"}
    
    response = requests.request(
        args.method,
        f"{API_BASE}/{args.endpoint}",
        headers=headers,
        json=args.data and json.loads(args.data)
    )
    
    print(response.json())
    return response.status_code == 200

if __name__ == "__main__":
    sys.exit(0 if main() else 1)
```

### Template: Agent Wrapper

For AI agent integration:

```yaml
---
name: agent-wrapper
description: "Wrapper for AI agent"
metadata:
  clawdbot:
    emoji: "🤖"
    requires:
      bins: ["agent-binary"]
---
```

```python
#!/usr/bin/env python3
"""Agent wrapper skill."""

import subprocess
import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Agent Wrapper")
    parser.add_argument("--prompt", "-p", required=True)
    parser.add_argument("--model", "-m", default="default")
    parser.add_argument("--output", "-o", help="Output file")
    
    args = parser.parse_args()
    
    # Build command
    cmd = [
        "agent-binary",
        "--model", args.model,
        "--prompt", args.prompt
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if args.output:
        with open(args.output, "w") as f:
            f.write(result.stdout)
    else:
        print(result.stdout)
    
    return result.returncode

if __name__ == "__main__":
    sys.exit(main())
```

## Best Practices

### 1. Document Thoroughly

```markdown
## Capabilities

- **Feature A**: Description
- **Feature B**: Description
- **Feature C**: Description

## Limitations

- Does not support X
- Requires Y
- May have rate limits
```

### 2. Handle Errors Gracefully

```python
def main():
    try:
        result = do_something()
        print(json.dumps(result, indent=2))
        return 0
    except FileNotFoundError:
        print("Error: Required tool not found", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
```

### 3. Support Common CLI Patterns

- Support `-h` / `--help`
- Support `-v` / `--verbose` for debugging
- Support `-o` / `--output` for file output
- Support stdin with `-` or `--input -`

### 4. Use Structured Output

```python
import json

def output_result(data, format="json"):
    if format == "json":
        print(json.dumps(data, indent=2))
    elif format == "yaml":
        import yaml
        print(yaml.dump(data))
```

### 5. Test Your Skill

```bash
# Run tests
python -m pytest tests/

# Test manually
python scripts/main.py --input test.json --verbose
```

## Publishing to ClawdHub

### Step 1: Validate

```bash
# Check skill structure
skill-creator validate --path /path/to/skill

# Fix any issues
```

### Step 2: Package

```bash
# Create distribution package
skill-creator package --path /path/to/skill --output ./dist
```

### Step 3: Publish

```bash
# Login to ClawdHub
clawdhub login

# Publish skill
clawdhub publish ./dist/skill-name-1.0.0.tar.gz

# Or push from git
clawdhub publish --repo https://github.com/you/skill-name.git
```

### Step 4: Tag Version

```bash
# Create git tag
git tag v1.0.0
git push origin v1.0.0
```

## Skill Metadata Reference

### Full Frontmatter Schema

```yaml
---
name: skill-name              # Required: skill identifier
slug: skill-name              # Optional: URL-friendly name
description: "Description"    # Required: brief description
homepage: https://example.com # Optional: project homepage
metadata:
  clawdbot:
    emoji: "🔧"              # Optional: icon
    requires:                # Dependencies
      bins: ["tool1", "tool2"]
      env: ["VAR1", "VAR2"]
      config: ["key1", "key2"]
      os: ["darwin", "linux"]
    install:                 # Installation instructions
      - id: unique-id
        kind: brew|apt|uv|go|node|download
        formula: package-name
        package: package-name
        module: go/module@latest
        cask: cask-name
        url: https://...
        archive: tar.bz2|zip
        os: ["darwin", "linux"]
        label: Human-readable label
    primaryEnv: "ENV_VAR"     # Primary environment variable
tags: ["tag1", "tag2"]       # Optional: search tags
license: MIT                 # Optional: license
author: "Name <email>"       # Optional: author info
---
```

### Installation Kinds

| Kind | Use Case |
|------|----------|
| `brew` | Homebrew formula |
| `apt` | Debian/Ubuntu package |
| `uv` | Python package (uv) |
| `go` | Go module |
| `node` | npm package |
| `cask` | Homebrew cask |
| `download` | Direct download |

## Example: Complete Skill

### Structure

```
my-api-tool/
├── SKILL.md
├── README.md
├── scripts/
│   ├── main.py
│   └── utils.py
├── config/
│   └── config.yaml
└── tests/
    └── test_main.py
```

### SKILL.md

```yaml
---
name: my-api-tool
description: "Query and manage API endpoints with ease"
metadata:
  clawdbot:
    emoji: "🚀"
    requires:
      bins: ["python3"]
      env: ["MY_API_KEY"]
    primaryEnv: "MY_API_KEY"
    install:
      - id: python-brew
        kind: brew
        formula: python
        label: "Install Python (brew)"
---
```

### README.md

```markdown
# My API Tool

Query APIs with style.

## Quick Start

```bash
export MY_API_KEY="your-key"
python3 scripts/main.py --endpoint users --method GET
```

## Features

- Simple API queries
- JSON output
- Configurable timeouts
```

## Testing Your Skill

### Manual Testing

```bash
# Test help
python scripts/main.py --help

# Test basic functionality
python scripts/main.py --input test.json

# Test error handling
python scripts/main.py --input missing.json
```

### Automated Testing

```bash
# Run test suite
python -m pytest tests/ -v

# Coverage report
python -m pytest tests/ --cov=scripts/ --cov-report=html
```

### Integration Testing

```bash
# Test with real API (if available)
export MY_API_KEY="test-key"
python scripts/main.py --endpoint test --method GET
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Tool not found | Check `requires.bins` in SKILL.md |
| Missing environment variable | Check `requires.env` |
| Permission denied | Check file permissions |
| Import error | Check Python dependencies |

### Debug Mode

```python
import sys

if args.verbose:
    print(f"Debug: {locals()}", file=sys.stderr)
```

---

## Checklist Before Publishing

- [ ] SKILL.md exists with frontmatter
- [ ] Description is clear and concise
- [ ] Dependencies are documented
- [ ] Installation instructions are complete
- [ ] Usage examples work correctly
- [ ] Error handling is implemented
- [ ] Tests pass (if any)
- [ ] README.md exists (optional but recommended)
- [ ] Version is tagged in git
- [ ] License is specified (optional)

---

## Resources

- [ClawdHub](https://clawdhub.com) - Skill marketplace
- [skill-creator docs](skil-creator/SKILL.md) - Scaffolding tool
- [Example skills](/Users/scrimwiggins/clawdbot/skills/) - Reference implementations

---

**For skill reference**, see [11 - Skill Reference Complete](11-skill-reference-complete.md)
