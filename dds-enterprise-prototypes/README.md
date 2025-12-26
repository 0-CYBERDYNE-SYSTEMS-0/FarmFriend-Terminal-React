# DDS Enterprise Prototypes

A collection of enterprise-grade web application prototypes showcasing various UI/UX patterns and features.

## Overview

This project contains 7 production-ready prototype applications organized into three categories:

- **Chatbots** (2 prototypes)
- **Service Desks** (2 prototypes)  
- **Design Concepts** (3 prototypes)

## Project Structure

```
dds-enterprise-prototypes/
├── proto-chatbot.html              # Enhanced Chatbot Platform
├── proto-chatbot-1.html            # Standard Chatbot Platform
├── proto-service-desk.html         # AI-Powered Service Desk
├── proto-service-desk-1.html       # Enterprise Service Desk
├── proto-glass-morphism.html       # Glass Morphism Dashboard
├── proto-brutalist.html            # Brutalist UI Demo
├── proto-voice-commands.html       # Voice Commands Interface
├── assets/                         # Shared resources
│   ├── styles.css                 # Reusable CSS styles
│   ├── main.js                    # Shared JavaScript utilities
│   ├── openai.png
│   └── deepseek.png
```

---

## Prototypes

### 🤖 Chatbots

#### 1. Enhanced Chatbot Platform (`proto-chatbot.html`)
**Features:**
- Real AI responses via OpenRouter API (DeepSeek V3, GPT-4o, Claude 3.5, Gemini 2.0)
- Voice input with Web Speech API
- Sentiment analysis
- Multi-language support (English, Spanish, French, German, Japanese, Chinese)
- Analytics dashboard with conversation metrics
- Conversation history
- Export functionality (JSON/CSV/TXT)
- User profiles
- Toast notifications
- Dark theme
- Enterprise integrations monitoring

**Status:** ✅ Fully functional with real AI integration

---

#### 2. Standard Chatbot Platform (`proto-chatbot-1.html`)
**Features:**
- Real-time chat interface
- Bot and user message differentiation
- Typing indicators
- Auto-scroll to latest message
- Message timestamps

**Status:** ⚠️ Uses demo mode (no real AI integration)

---

### 🎧 Service Desks

#### 3. AI-Powered Service Desk (`proto-service-desk.html`)
**Features:**
- Dashboard with key metrics
- Ticket management system
- Ticket filtering and sorting
- Priority levels (Low, Medium, High, Urgent)
- Status tracking (Open, In Progress, Resolved, Closed)
- Agent assignment
- SLA monitoring
- Performance analytics
- Customer satisfaction tracking

**Status:** ✅ Full-featured with demo data

---

#### 4. Enterprise Service Desk (`proto-service-desk-1.html`)
**Features:**
- Service request management
- Request categorization
- Quick actions (View, Edit, Resolve)
- Real-time status updates
- Request history
- User information display

**Status:** ✅ Fully functional

---

### 🎨 Design Concepts

#### 5. Glass Morphism Dashboard (`proto-glass-morphism.html`)
**Features:**
- Modern glass morphism UI design
- Blur effects and transparency
- Animated elements
- Responsive layout
- Gradient backgrounds

**Status:** ✅ Visual demo

---

#### 6. Brutalist UI Demo (`proto-brutalist.html`)
**Features:**
- Brutalist design aesthetic
- Bold typography
- High contrast elements
- Raw, geometric layouts
- Monochromatic color scheme

**Status:** ✅ Visual concept demo

---

#### 7. Voice Commands Interface (`proto-voice-commands.html`)
**Features:**
- Voice command recognition via Web Speech API
- Real-time transcription display
- Command interpretation
- Visual feedback for voice activity
- Interactive demo commands

**Status:** ✅ Functional with Web Speech API

---

## Shared Assets

### `assets/styles.css`
Common CSS styles used across prototypes including:
- Base styling and resets
- Layout utilities
- Color variables
- Typography
- Component styles

### `assets/main.js`
Shared JavaScript utilities including:
- Helper functions
- Common event handlers
- Utility methods

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build process required - open HTML files directly

### Running the Prototypes

Simply open any HTML file in your web browser:

```bash
# Open in default browser (macOS)
open proto-chatbot.html

# Or navigate to the file in your file explorer and double-click
```

### For the Enhanced Chatbot Platform

The enhanced chatbot requires an OpenRouter API key. Create a `.env` file or configure directly in the browser:

```javascript
const OPENROUTER_API_KEY = 'your-api-key-here';
```

**Available Models:**
- `deepseek/deepseek-chat-v3` (default - recommended)
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`
- `google/gemini-2.0-flash-exp`

---

## Development

### Adding New Prototypes

1. Create a new HTML file in the root directory
2. Follow the naming convention: `proto-[name].html`
3. Use shared assets from `assets/` where possible
4. Update this README with your prototype details

### Modifying Existing Prototypes

- Each prototype is self-contained in its HTML file
- Shared styles and scripts are in the `assets/` directory
- Make changes to shared assets carefully as they affect multiple prototypes

---

## Features by Category

| Feature | Chatbots | Service Desks | Design Concepts |
|---------|----------|---------------|-----------------|
| Real AI Responses | ✅ (enhanced) | - | - |
| Voice Input | ✅ | - | ✅ (voice) |
| Analytics | ✅ | ✅ | - |
| Dashboard | ✅ | ✅ | ✅ |
| Multi-language | ✅ | - | - |
| Export Functionality | ✅ | - | - |
| Dark Theme | ✅ | - | - |

---

## Browser Compatibility

- **Chrome/Edge:** Full support for all features
- **Firefox:** Full support
- **Safari:** Full support (may require HTTPS for voice features)
- **Mobile:** Responsive designs work on mobile browsers

---

## Future Enhancements

Potential improvements for the prototypes:

1. **Backend Integration**
   - Add REST API for chatbot
   - Implement real database for tickets
   - Add user authentication

2. **Analytics**
   - Persist analytics data
   - Add more visualization options
   - Export analytics reports

3. **Voice Features**
   - Add voice output/synthesis
   - Support more languages for voice
   - Improve noise cancellation

4. **Design System**
   - Create a unified design system
   - Add more theme options
   - Improve accessibility (WCAG compliance)

---

## License

This is a demonstration project created for DDS Enterprise. All rights reserved.

---

## Contact & Support

For questions or support related to these prototypes, please contact the DDS Enterprise development team.

---

**Last Updated:** December 2025
