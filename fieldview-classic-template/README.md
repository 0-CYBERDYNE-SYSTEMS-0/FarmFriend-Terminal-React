# FieldView Classic UI Template

A modern, terminal-inspired dashboard interface built with React, TypeScript, and Tailwind CSS. This template provides the FieldView Classic UI from FarmFriend, adapted for reuse with any CLI backend.

## Features

- 🎨 **Clean Agriculture Theme**: Professional field operations dashboard
- 📊 **Live Status Rail**: Real-time gateway, automation, and health indicators
- 💬 **Embedded Chat**: WebSocket-based terminal interface
- 📱 **Responsive Design**: Works on desktop and mobile
- 🔄 **Auto-Reconnection**: Reliable WebSocket connection
- ⚡ **Smooth Streaming**: Optimized message rendering with requestAnimationFrame

## Quick Start

1. **Clone or copy** this template to your project
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start development**:
   ```bash
   npm run dev
   ```
4. **Open browser** to `http://localhost:3000`

## Project Structure

```
fieldview-classic-template/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   │   ├── StatusPills.tsx
│   │   │   ├── Markdown.tsx
│   │   │   └── ...
│   │   ├── features/         # Feature-specific components
│   │   │   ├── FieldViewClassic.tsx  # Main dashboard
│   │   │   └── EmbeddedChat.tsx      # Chat interface
│   │   └── ...
│   ├── contexts/
│   │   └── ThemeContext.tsx   # Theme management
│   ├── hooks/
│   │   └── useWebSocket.ts    # WebSocket logic
│   ├── store/
│   │   └── types.ts          # Type definitions
│   ├── styles/
│   │   └── globals.css        # Global styles
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## Customization Guide

### 1. Change Domain Theme

Edit `tailwind.config.js` to update colors:

```javascript
theme: {
  extend: {
    colors: {
      fieldview: {
        primary: {
          500: '#22c55e',  // Change from emerald to blue
          // ...
        }
      }
    }
  }
}
```

### 2. Update Branding

Edit `FieldViewClassic.tsx`:

```tsx
<span className="text-xs uppercase tracking-[0.25em] text-blue-700">
  YourSystem Name
</span>
<h1 className="text-3xl md:text-4xl font-semibold">
  Your Dashboard Title
</h1>
```

### 3. Modify Status Metrics

Update the status cards in `FieldViewClassic.tsx`:

```tsx
<div className="field-card">
  <h3 className="text-sm font-semibold text-blue-900">Your Metric</h3>
  <div className="mt-2 text-sm text-blue-900/80">
    <p>Your metric value</p>
    <p className="text-xs text-blue-700 mt-1">Description</p>
  </div>
</div>
```

### 4. Backend Integration

Your backend needs to implement these WebSocket endpoints:

#### WebSocket: `ws://localhost:8080/ws/terminal/{sessionId}`

**Client → Server Messages**:
```json
{
  "type": "command",
  "data": { "command": "your command here" }
}
```

**Server → Client Messages**:
```json
{
  "type": "response",
  "content": "Response content",
  "session_id": "main",
  "timestamp": 1234567890
}
```

#### HTTP API: `GET /api/overview`

Response format:
```json
{
  "timestamp": "2024-01-10T10:00:00Z",
  "gateway": {
    "channels": [
      {
        "name": "channel-name",
        "enabled": true,
        "healthy": true,
        "running": true
      }
    ]
  },
  "scheduler": {
    "task_count": 5,
    "enabled_count": 3,
    "next_run_at": 1641800000
  },
  "health": {
    "ok": true,
    "issues": []
  }
}
```

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Type checking only

## Theme System

The template includes 4 built-in themes:
- **default** - Agriculture green/amber theme
- **highContrast** - High contrast for accessibility
- **muted** - Subtle, reduced visual noise
- **dark** - Dark theme for low-light environments

Switch themes via the ThemeProvider or add your own in `ThemeContext.tsx`.

## Component Overview

### FieldViewClassic
Main dashboard component with:
- Header with branding and navigation
- Status rail with live metrics
- Morning briefing section with quick actions
- Connectivity/automation/health cards
- Embedded chat integration point

### EmbeddedChat
Full-featured chat component with:
- WebSocket connection management
- Message rendering with Markdown support
- Thinking message styling
- File upload capability
- Auto-scroll and smooth streaming

### StatusPills
Reusable status indicators with:
- Configurable colors (good/warn/bad/muted)
- Label and value display
- Theme-aware styling

## Tips for Customization

1. **Keep the Structure**: The component hierarchy is designed for easy customization
2. **Use Tailwind Classes**: All styling uses Tailwind utilities for consistency
3. **Follow the WebSocket Protocol**: The message format is simple but specific
4. **Test Responsiveness**: Use md: and lg: prefixes for desktop features
5. **Preserve Auto-Reconnection**: The WebSocket hook handles connection recovery

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder with your preferred web server

3. Ensure your WebSocket server is accessible at the configured port

## Support

This template provides a solid foundation. For specific integrations or custom features, refer to the component source code - it's designed to be readable and extensible.