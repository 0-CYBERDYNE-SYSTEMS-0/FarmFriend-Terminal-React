# FieldView Enhanced Features

This document describes the enhanced features added to the FieldView template for syntax highlighting, HTML artifacts rendering, and markup processing.

## 🎨 Features Added

### 1. **Syntax Highlighting**
- **Component**: `CodeBlock.tsx` with Shiki integration
- **Themes**: GitHub Dark (default), supports multiple themes
- **Languages**: All major programming languages
- **Features**: Copy code, line numbers (optional), error handling

### 2. **HTML Artifacts**
- **Component**: `HTMLArtifact.tsx`
- **Features**:
  - Live iframe rendering with sandbox
  - Source view with syntax highlighting
  - Download as .html file
  - Open in new tab
  - Error handling for invalid HTML

### 3. **JSON Artifacts**
- **Component**: `JSONArtifact.tsx`
- **Features**:
  - JSON validation and formatting
  - Collapsible/expandable view
  - Syntax highlighting
  - Download as .json file
  - Error display for invalid JSON

### 4. **Code Artifacts**
- **Component**: `CodeArtifact.tsx`
- **Features**:
  - Syntax highlighting for detected language
  - Language-specific file extensions
  - Download with correct extension
  - Support for 20+ languages

### 5. **Image Artifacts**
- **Component**: `ImageArtifact.tsx`
- **Features**:
  - Image preview with proper sizing
  - Download as original file
  - Open in new tab
  - Responsive display

### 6. **Canvas Template**
- **File**: `canvas-template.html`
- **Features**:
  - Self-contained HTML editor
  - Live preview with error detection
  - Format and minify tools
  - Validation helpers
  - Export functionality
  - Save to workspace integration point

### 7. **Enhanced Markdown**
- **Component**: `MarkdownSimple.tsx`
- **Features**:
  - Artifact detection and rendering
  - Headers (H1-H6)
  - Lists (ordered/unordered)
  - Block quotes
  - Code blocks with syntax highlighting
  - Inline code
  - No external dependencies

### 8. **Enhanced Chat**
- **Component**: `EmbeddedChatWithArtifacts.tsx`
- **Features**:
  - Artifact extraction from messages
  - Artifact sidebar with type badges
  - Download artifacts directly
  - Open in Canvas editor
  - File upload support
  - Multiple file attachments

## 📁 File Structure

```
src/components/
├── ui/
│   ├── CodeBlock.tsx          # Syntax highlighting with Shiki
│   ├── ArtifactPreview.tsx     # HTML/JSON/Image/Code artifacts
│   ├── MarkdownSimple.tsx      # Artifact-aware markdown
│   └── index.tsx              # UI component exports
├── features/
│   ├── EmbeddedChatWithArtifacts.tsx  # Enhanced chat with artifacts
│   └── ...
└── canvas-template.html          # Standalone HTML editor
```

## 🚀 Integration Guide

### For CLI Backend

#### 1. WebSocket Protocol (Enhanced)
```typescript
// Client → Server
type ClientMessage = {
  type: 'command'
  data: { 
    command: string
    files?: FileAttachment[]
  }
}

// Server → Client (with artifact support)
type ServerMessage = {
  type: 'response'
  content: string
  artifacts?: Array<{
    id: string
    type: 'html' | 'json' | 'image' | 'code'
    content: string
    filename: string
  }>
}
```

#### 2. Artifact Storage
```typescript
// CLI should save artifacts to workspace
interface ArtifactStorage {
  saveArtifact: (artifact: {
    type: string
    content: string
    filename: string
  }) => Promise<string> // Returns file path
  
  listArtifacts: () => Promise<Artifact[]>
  openArtifact: (path: string) => Promise<void>
}
```

#### 3. Canvas Integration
```typescript
// CLI can serve canvas editor
app.get('/canvas/:artifactId', (req, res) => {
  const artifact = getArtifact(req.params.artifactId)
  res.sendFile(path.join(__dirname, 'canvas-template.html'))
})

// CLI receives edited artifact via postMessage
window.addEventListener('message', (event) => {
  if (event.data.type === 'save_artifact') {
    // Save to workspace
    saveArtifact(event.data.content, event.data.filename)
  }
})
```

## 🔧 Configuration Options

### Package.json Dependencies
```json
{
  "dependencies": {
    "shiki": "^1.24.2",           // Syntax highlighting
    "dompurify": "^3.2.3",      // HTML sanitization
    "react-markdown": "^9.0.1",   // Enhanced markdown (optional)
    "remark-gfm": "^4.0.0",        // GitHub flavored markdown
    "rehype-highlight": "^7.0.0"  // Code highlighting in markdown
  }
}
```

### Environment Variables
```bash
# Canvas template configuration
CANVAS_THEMES=github-dark,monokai
CANVAS_AUTOSAVE=true
CANVAS_VALIDATE_HTML=true

# Artifact storage
ARTIFACTS_DIR=./artifacts
MAX_ARTIFACT_SIZE=25MB
ARTIFACT_EXPIRY=7d
```

## 🎯 Customization Options

### 1. Add New Artifact Types
```typescript
// In ArtifactPreview.tsx
export function CustomArtifact({ content }: ArtifactPreviewProps) {
  // Custom rendering logic
  return (
    <div className="artifact-preview">
      {/* Your custom UI */}
    </div>
  )
}

// Add to type union
type ArtifactType = 'html' | 'json' | 'image' | 'code' | 'custom'
```

### 2. Syntax Highlighting Themes
```typescript
// In CodeBlock.tsx
const themes = {
  'github-dark': 'github-dark',
  'monokai': 'monokai',
  'dracula': 'dracula',
  'nord': 'nord'
}

// Add theme selector
<select onChange={(e) => setTheme(e.target.value)}>
  {Object.entries(themes).map(([name, value]) => (
    <option value={value}>{name}</option>
  ))}
</select>
```

### 3. Canvas Extensions
```html
<!-- Add custom tools to toolbar -->
<script>
function customTool() {
  // Your custom functionality
  const content = editor.getValue()
  // Process content
  editor.setValue(processedContent)
}

// Add to toolbar
<button onclick="customTool()">Custom Tool</button>
</script>
```

## 📊 Performance Optimizations

### 1. Code Splitting
```typescript
// Lazy load heavy components
const CodeBlock = lazy(() => import('./CodeBlock'))
const CanvasEditor = lazy(() => import('./CanvasEditor'))

// In component
<Suspense fallback={<div>Loading...</div>}>
  <CodeBlock code={largeCode} />
</Suspense>
```

### 2. Artifact Caching
```typescript
// Cache parsed artifacts
const artifactCache = new Map<string, ParsedArtifact>()

function getCachedArtifact(id: string) {
  if (artifactCache.has(id)) {
    return artifactCache.get(id)
  }
  // Parse and cache
}
```

### 3. Virtual Scrolling
```typescript
// For large artifact lists
import { FixedSizeList as List } from 'react-window'

function ArtifactList({ artifacts }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ArtifactCard artifact={artifacts[index]} />
    </div>
  )
  
  return (
    <List
      height={400}
      itemCount={artifacts.length}
      itemSize={80}
    >
      {Row}
    </List>
  )
}
```

## 🎨 UI/UX Enhancements

### 1. Dark/Light Mode Toggle
```typescript
// Automatic theme detection
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

// Theme switching
const [theme, setTheme] = useState('dark')

useEffect(() => {
  document.documentElement.className = theme
}, [theme])
```

### 2. Responsive Design
```css
/* Mobile optimizations */
@media (max-width: 768px) {
  .artifact-preview {
    flex-direction: column;
  }
  
  .canvas-container {
    grid-template-columns: 1fr;
  }
  
  .editor-pane {
    border-right: none;
    border-bottom: 1px solid #333;
  }
}
```

### 3. Loading States
```typescript
// Skeleton loading
function ArtifactSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    </div>
  )
}
```

## 🔒 Security Considerations

### 1. HTML Sanitization
```typescript
import DOMPurify from 'dompurify'

const safeHTML = DOMPurify.sanitize(userHTML, {
  ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'code', 'pre'],
  ALLOWED_ATTR: ['class', 'id']
})
```

### 2. Sandbox Iframes
```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms"
  src="about:blank"
  onload="this.src=trustedHTML"
></iframe>
```

### 3. Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'">
```

## 🚀 Deployment Guide

### 1. Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['./src/components/ui/index.ts'],
          'features': ['./src/components/features/index.ts']
        }
      }
    }
  }
})
```

### 2. Docker Configuration
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### 3. CDN Setup
```html
<!-- Load heavy dependencies from CDN -->
<script src="https://unpkg.com/shiki@1.24.2"></script>
<link rel="stylesheet" href="https://unpkg.com/codemirror@6">
```

## 📚 API Reference

### ArtifactPreview Components

#### HTMLArtifact
```typescript
interface Props {
  content: string    // HTML content
  title?: string     // Artifact title
}
```

#### JSONArtifact
```typescript
interface Props {
  content: string    // JSON string
  title?: string     // Artifact title
}
```

#### CodeArtifact
```typescript
interface Props {
  content: string    // Code content
  title?: string     // Artifact title
  lang?: string      // Programming language
}
```

### CodeBlock Component
```typescript
interface Props {
  code: string       // Code to highlight
  lang?: string      // Language identifier
  theme?: string     // Shiki theme
  showLineNumbers?: boolean
  allowCopy?: boolean
}
```

### Canvas Template API
```javascript
// Global functions available in canvas
window.formatHTML()    // Format HTML
window.minifyHTML()    // Minify HTML  
window.validateHTML()   // Validate HTML
window.downloadFile()   // Download file
window.saveToWorkspace() // Save to CLI workspace
```

This enhanced FieldView template provides a complete solution for CLI programs that need rich artifact rendering, syntax highlighting, and a canvas-like editing experience while maintaining terminal-first workflow.