# Testing & Quality Skills

> **Testing, documentation, and quality assurance tools**  
> Version: 1.0 | Last Updated: February 2026

---

## Overview

Testing and quality skills ensure software reliability through automated testing, professional documentation generation, and content summarization. These skills help maintain high standards across projects.

### Skills in This Category

| Skill | Purpose | Primary Tool |
|-------|---------|--------------|
| `webapp-testing` | Web application testing | Playwright |
| `docs` | Professional documentation generator | Kimi K2.5 + Gemini 3 Flash |
| `summarize` | Content summarization and extraction | summarize.sh CLI |

---

## webapp-testing

### Purpose
Test local web applications using Playwright. Verify frontend functionality, debug UI behavior, capture browser screenshots, and view browser logs.

### Installation

```bash
# Check available scripts first
python scripts/with_server.py --help
```

### Decision Tree

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file directly → Write Playwright script
    │
    └─ No (dynamic webapp) → Server running?
        ├─ No → Use with_server.py helper
        └─ Yes → Reconnaissance-then-action pattern
```

### with_server.py Helper

**Single server:**
```bash
python scripts/with_server.py --server "npm run dev" --port 5173 -- python your_automation.py
```

**Multiple servers (backend + frontend):**
```bash
python scripts/with_server.py \
  --server "cd backend && python server.py" --port 3000 \
  --server "cd frontend && npm run dev" --port 5173 \
  -- python your_automation.py
```

### Basic Playwright Script

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Navigate
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    
    # Inspect DOM
    page.screenshot(path='/tmp/inspect.png', full_page=True)
    content = page.content()
    buttons = page.locator('button').all()
    
    # Interact
    page.fill('input#search', 'query')
    page.click('button[type="submit"]')
    
    # Verify
    assert page.locator('.results').count() > 0
    
    browser.close()
```

### Reconnaissance-then-Action Pattern

**Step 1: Inspect rendered DOM**
```python
page.screenshot(path='/tmp/inspect.png', full_page=True)
content = page.content()
page.locator('button').all()
page.locator('a').all()
page.locator('input').all()
```

**Step 2: Identify selectors from inspection**
- Use `text=` for visible text
- Use `role=` for ARIA roles
- Use CSS selectors for complex cases
- Use IDs for unique elements

**Step 3: Execute actions**
```python
page.click('text=Submit')
page.fill('input[name="email"]', 'test@example.com')
page.select_option('select#country', label='United States')
```

### Common Pitfalls

**❌ Don't inspect before networkidle**
```python
# Wrong - DOM may be incomplete
page.goto('http://localhost:3000')
page.screenshot(path='inspect.png')  # Too early!
```

**✅ Wait for networkidle first**
```python
# Correct - DOM is complete
page.goto('http://localhost:3000')
page.wait_for_load_state('networkidle')
page.screenshot(path='inspect.png')
```

### Best Practices

| Practice | Description |
|----------|-------------|
| **Use bundled scripts** | Call `scripts/with_server.py` instead of writing server logic |
| **Wait for networkidle** | Critical for dynamic SPAs |
| **Use sync_playwright** | Simpler than async for most tasks |
| **Close browser** | Always call `browser.close()` |
| **Descriptive selectors** | `text=Submit` > `button:nth-child(3)` |
| **Add appropriate waits** | `page.wait_for_selector()` when needed |

### Example Scripts

**Element Discovery** (`examples/element_discovery.py`):
```python
# Find all interactive elements
buttons = page.locator('button').all()
links = page.locator('a').all()
inputs = page.locator('input').all()
forms = page.locator('form').all()

print(f"Found {len(buttons)} buttons, {len(links)} links")
```

**Static HTML Automation** (`examples/static_html_automation.py`):
```python
page.goto('file:///path/to/local/html/index.html')
# No server needed for static files
```

**Console Logging** (`examples/console_logging.py`):
```python
console_messages = []
page.on('console', lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))

page.goto('http://localhost:3000')
page.wait_for_load_state('networkidle')

for msg in console_messages:
    print(msg)
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Element not found | Wait for `networkidle`, then re-inspect |
| Click intercepted | Use `page.wait_for_load_state('domcontentloaded')` |
| Timeout errors | Increase `page.set_default_timeout(30000)` |
| Headless issues | Set `headless=False` for debugging |

---

## docs

### Purpose
Generate professional software documentation with rigorous research, Kimi K2.5 structured thinking, and Gemini 3 Flash modern design. Creates stunning docs that elevate projects.

### Installation

```bash
brew install uv
uv pip install -r requirements.txt
```

### Usage

```bash
uv run {baseDir}/scripts/generate_docs.py --path "/path/to/project" --type "all"
```

### Output Types

| Type | Description | Best For |
|------|-------------|----------|
| `readme` | Comprehensive README with badges | GitHub repos |
| `api` | Complete API reference | Libraries, SDKs |
| `guide` | User guides and tutorials | Onboarding |
| `website` | Full static HTML/CSS/JS site | Documentation portals |
| `all` | Complete documentation suite | Full projects |

### Options

| Option | Description |
|--------|-------------|
| `--path, -p` | Project root path (required) |
| `--type, -t` | Documentation type |
| `--output, -o` | Output directory |
| `--theme` | Theme: brutalist/swiss/minimal/technical |
| `--title` | Project title |
| `--tagline` | One-line description |
| `--audience` | Target: beginners/intermediate/experts |
| `--ai-think` | Enable Kimi K2.5 reasoning |
| `--ai-design` | Enable Gemini 3 Flash design |

### Examples

```bash
# Full documentation with AI enhancement
uv run {baseDir}/scripts/generate_docs.py -p ~/myproject -t all --ai-think --ai-design

# README only with brutalist theme
uv run {baseDir}/scripts/generate_docs.py -p ~/myproject -t readme \
  --theme brutalist --title "SuperTool" --tagline "Ultimate solution"

# Complete website with swiss theme
uv run {baseDir}/scripts/generate_docs.py -p ~/project -t website \
  --audience experts --title "Enterprise SDK" --theme swiss

# API documentation
uv run {baseDir}/scripts/generate_docs.py -p ~/library -t api --theme technical
```

### Phases

**Phase 1: Rigorous Research**
- Complete file tree traversal and categorization
- Language detection and version identification
- Dependency mapping and architecture analysis
- Framework and library detection
- Audience and competitor research

**Phase 2: Kimi K2.5 Thinking**
- Documentation architecture design
- Content strategy and section prioritization
- Example selection and user journey mapping
- Gap analysis for undocumented areas

**Phase 3: Gemini 3 Flash Design**
- Modern Swiss/Brutalist typography
- Monospace metadata blocks for AI parsing
- Semantic structure with clear hierarchy
- High contrast, minimal color design

### Model Configuration

```json
{
  "skills": {
    "docs": {
      "thinkModel": "kimi-code/kimi-for-coding",
      "designModel": "gemini-2.0-flash",
      "features": {
        "reasoning": true,
        "designGeneration": true,
        "seoOptimization": true,
        "interactiveExamples": true
      }
    }
  }
}
```

### Model Selection Guide

| Phase | Model | Purpose | When to Use |
|-------|-------|---------|-------------|
| Thinking | Kimi K2.5 | Architecture, structure | Complex projects |
| Design | Gemini 3 Flash | Visual design | All projects |
| Fallback | MiniMax-M2.1 | General generation | When specialized unavailable |

### Generated Documentation Includes

**Content Excellence:**
- Compelling hero section with value proposition
- Quick start guide for immediate productivity
- Comprehensive examples with real scenarios
- API reference with parameter tables
- Troubleshooting and FAQ sections

**Visual Design:**
- Modern CSS with custom properties
- Responsive grid layouts
- Accessible color schemes
- Print-friendly styles
- Syntax highlighting

**SEO & Discovery:**
- Semantic HTML structure
- Meta description optimization
- Open Graph tags
- JSON-LD structured data

**Performance:**
- Minimal CSS (under 10KB gzipped)
- No external dependencies
- Lazy loading for images
- Cache-friendly structure

### Integration

**GitHub:**
- Shields.io badges ready
- Issue/PR templates auto-generated
- GitHub Pages deployment ready

**CI/CD:**
- Documentation build in pipelines
- Automated API doc generation
- Version-based doc branching

---

## summarize

### Purpose
Summarize or extract text/transcripts from URLs, podcasts, videos, and local files. Excellent fallback for transcribing YouTube/video content.

### Installation

```bash
brew install steipete/tap/summarize
```

### Usage

```bash
# Summarize URL
summarize "https://example.com/article"

# Summarize local file
summarize ./document.pdf

# Summarize YouTube video
summarize "https://www.youtube.com/watch?v=VIDEO_ID"

# Extract transcript only
summarize --transcript "https://www.youtube.com/watch?v=VIDEO_ID"

# Specify length
summarize --length short "https://long article.com"
summarize --length long "https://article.com" --output summary.md
```

### Options

| Option | Description |
|--------|-------------|
| `--length short/medium/long` | Summary verbosity |
| `--output, -o` | Output file path |
| `--transcript` | Extract transcript only (videos/podcasts) |
| `--format markdown/text` | Output format |
| `--language en/es/fr` | Target language |

### Use Cases

**YouTube Video Summaries:**
```bash
summarize "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
summarize --transcript "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Article Summaries:**
```bash
summarize "https://blog.post.com/interesting-article"
summarize --length long "https://blog.post.com/article" --output summary.md
```

**Podcast Transcripts:**
```bash
summarize --transcript "https://podcast.com/episode-1"
```

**Local Files:**
```bash
summarize ./document.pdf
summarize ./transcript.txt
```

### Best Practices

1. **Use `--transcript`** for videos when you need the full text
2. **Use `--length`** to control summary depth
3. **Combine with `openai-whisper`** for audio-only transcription
4. **Pipe to files** for later reference: `summarize URL > summary.md`

---

## Workflow Examples

### Automated Testing & Documentation Pipeline

```bash
# 1. Run Playwright tests
python scripts/with_server.py --server "npm run dev" --port 5173 \
  -- python tests/e2e_suite.py

# 2. If tests pass, generate documentation
uv run {baseDir}/scripts/generate_docs.py -p ~/project -t all --ai-design

# 3. Push docs to repository
cd ~/project/docs && git add -A && git commit -m "docs: auto-generated"
git push origin main
```

### Content Research Workflow

```bash
# 1. Find relevant articles (web search)
web_search query "React best practices 2025"

# 2. Summarize top 3 articles
summarize "https://article1.com" --length medium --output research/article1.md
summarize "https://article2.com" --length medium --output research/article2.md
summarize "https://article3.com" --length medium --output research/article3.md

# 3. Create combined report
cat research/*.md > research/combined.md

# 4. Use in documentation
# Reference: research/combined.md
```

### Video Content Analysis

```bash
# 1. Extract transcript
summarize --transcript "https://www.youtube.com/watch?v=VIDEO_ID" > transcript.txt

# 2. Get summary
summarize --length long "https://www.youtube.com/watch?v=VIDEO_ID" > summary.md

# 3. Create timestamped notes
# (manual review of transcript.txt)

# 4. Include in documentation as reference
```

---

## Testing & Quality Skill Matrix

| Task | Recommended Skill | Notes |
|------|------------------|-------|
| Web app E2E testing | `webapp-testing` | Use with_server.py helper |
| Screenshot testing | `webapp-testing` | page.screenshot() |
| Console log testing | `webapp-testing` | page.on('console') |
| API documentation | `docs` | Use --type api |
| README generation | `docs` | Use --type readme |
| Full documentation site | `docs` | Use --type website |
| Article summarization | `summarize` | --length controls depth |
| Video transcription | `summarize --transcript` | YouTube, podcasts |
| Content extraction | `summarize` | URLs, files, videos |

---

## Best Practices Summary

### Testing
- Always use `with_server.py` for server management
- Wait for `networkidle` before DOM inspection
- Use descriptive selectors (text=, role=)
- Close browser when done
- Log console messages for debugging

### Documentation
- Run `generate_docs.py --help` for all options
- Use `--ai-think` for complex projects
- Choose theme appropriate to project style
- Configure models for optimal performance
- Review and customize generated docs

### Summarization
- Use `--transcript` for full video text
- Control length with `--length` flag
- Save outputs for later reference
- Combine with other skills for research

---

## Next Steps

- **Master Playwright** - Deep dive into selectors and waits
- **Configure docs AI** - Tune models for your projects
- **Build test suites** - Comprehensive E2E coverage
- **Automate documentation** - CI/CD integration
- **Research workflows** - Combine summarize with web search

---

**For complete testing & quality skill documentation**, see individual SKILL.md files in `/Users/scrimwiggins/clawdbot/skills/`
