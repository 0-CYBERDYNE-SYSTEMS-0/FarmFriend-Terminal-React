# Troubleshooting

**Common issues, error messages, and solutions for FF Terminal development and usage.**

---

## Overview

This guide covers the most common issues encountered when developing with or running FF Terminal, along with their solutions. Issues are organized by component and severity.

### Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **Critical** | System unusable | Immediate fix required |
| 🟠 **High** | Major feature broken | Fix before deployment |
| 🟡 **Medium** | Feature impaired | Workaround available |
| 🟢 **Low** | Minor issue | Cosmetic or optional fix |

---

## Installation Issues

### 🔴 Node.js Version Mismatch

**Error**:
```
Error: The engine "node" is incompatible with this project.
Required: ">=20", Found: "18.19.1"
```

**Solution**:
```bash
# Check current version
node --version

# Install Node.js 20+ using nvm
nvm install 20
nvm use 20

# Verify installation
node --version  # Should show >= 20.x
```

### 🔴 npm Install Fails

**Error**:
```
npm ERR! code ETARGET
npm ERR! notarget No matching version found for some-package
npm ERR! A complete log of this error can be found in: npm-debug.log
```

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use exact versions
npm ci  # Instead of npm install
```

### 🟠 Dependency Resolution Warnings

**Error**:
```
npm WARN deprecated some-package@1.0.0: Package deprecated
```

**Solution**: These are warnings, not errors. The package may still work, but consider updating to a newer alternative if available.

### 🟠 Permission Denied on Install

**Error**:
```
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules/some-package
```

**Solution**:
```bash
# Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use nvm (recommended)
nvm install-latest-npm
```

---

## Build Issues

### 🔴 TypeScript Compilation Fails

**Error**:
```
error TS2322: Type 'string' is not assignable to type 'number'
error TS7006: Parameter 'x' implicitly has an 'any' type
```

**Solutions**:
```bash
# Check TypeScript errors
npx tsc --noEmit

# Common fixes:
# 1. Add type annotations
const value: string = 'hello';

# 2. Fix type mismatches
const num: number = parseInt('42');

// 3. Enable strict mode fixes
// In tsconfig.json, consider relaxing:
"strict": false,
"noImplicitAny": false
```

### 🔴 Build Process Hangs

**Error**: Build command never completes

**Solutions**:
```bash
# Kill build process
Ctrl+C

# Clear build cache
rm -rf dist node_modules/.cache

# Rebuild
npm run build

# If still hanging, check for infinite loops in code
# Look for:
# - Recursive functions without base cases
# - Infinite while loops
# - Unresolved promises
```

### 🟠 Web Client Build Fails

**Error**:
```
Error: Cannot find module 'vite'
Error: ENOENT: no such file or directory
```

**Solutions**:
```bash
# Install web client dependencies
cd src/web/client
npm install
cd ../..

# Check package.json
cat src/web/client/package.json

# Rebuild
npm run build:web
```

---

## Runtime Issues

### 🔴 Daemon Won't Start

**Error**:
```
Error: EADDRINUSE: address already in use :::28888
Error: listen EADDRININUSE :::28888
```

**Solutions**:
```bash
# Find process on port 28888
lsof -ti:28888

# Kill the process
kill -9 $(lsof -ti:28888)

# Or find by port
netstat -tlnp | grep 28888
kill -9 <pid>

# Use different port
export FF_TERMINAL_PORT=28889
```

**Also check**:
```bash
# Check if daemon already running
ps aux | grep ff-terminal

# Kill all running daemons
pkill -9 -f ff-terminal

# Restart fresh
npm run dev:daemon
```

### 🔴 WebSocket Connection Refused

**Error**:
```
WebSocket connection to 'ws://localhost:28888' failed: Connection refused
```

**Solutions**:
```bash
# Verify daemon is running
lsof -ti:28888

# Start daemon if not running
npm run dev:daemon &

# Check firewall
# macOS: System Preferences → Security & Privacy → Firewall
# Linux: sudo ufw status

# Test connection
nc -zv localhost 28888

# Check WebSocket protocol
# Ensure client is connecting to correct port
```

### 🟠 Session Persistence Issues

**Error**:
```
Error: Session not found
Error: Session expired
```

**Solutions**:
```bash
# List available sessions
ls ~/ff-terminal-workspace/sessions/

# Create new session
rm -rf ~/ff-terminal-workspace/sessions/*
npm run dev:cli

# Check session file format
cat ~/ff-terminal-workspace/sessions/*.json
```

### 🟠 Profile Not Found

**Error**:
```
Error: Profile 'my-profile' not found
Error: No default profile configured
```

**Solutions**:
```bash
# List profiles
ff-terminal profile list

# Create new profile
ff-terminal profile setup

# Set default profile
ff-terminal profile default my-profile

# Reset profiles (if corrupted)
rm ~/Library/Application\ Support/ff-terminal/profiles.json
ff-terminal profile setup
```

---

## Tool Execution Issues

### 🔴 Tool Not Registered

**Error**:
```
Error: Tool 'unknown_tool' not found
Available tools: read_file, write_file, run_command, ...
```

**Solutions**:
```bash
# List available tools
ff-terminal start --display-mode verbose

# Or in the CLI
/tools

# Check tool registry
cat src/runtime/tools/registry.ts

# Rebuild after adding new tool
npm run build
```

### 🔴 Tool Execution Timeout

**Error**:
```
Error: Tool execution timed out after 30000ms
```

**Solutions**:
```bash
# Increase timeout
export FF_TOOL_TIMEOUT=60000

# Check for infinite loops in tool
# Look at tool implementation

# Use simpler input
# Reduce file size for read operations
```

**Common causes**:
- Large file reads (use `FF_READ_FILE_MAX_BYTES`)
- Long-running commands
- Network timeouts

### 🟠 File Permission Errors

**Error**:
```
Error: EACCES: permission denied, access '/path/to/file'
Error: EPERM: operation not permitted
```

**Solutions**:
```bash
# Check file permissions
ls -la /path/to/file

# Fix permissions
chmod 644 /path/to/file

# Or run with elevated permissions (use sparingly)
sudo npm run dev

# For development, use ~/ff-terminal-workspace
export FF_WORKSPACE_DIR=~/ff-terminal-workspace
```

### 🟠 Missing Dependencies

**Error**:
```
Error: Cannot find module 'some-dependency'
```

**Solutions**:
```bash
# Check if dependency is installed
npm list some-dependency

# Install missing dependency
npm install some-dependency

# If local module
# Check import path in source code
```

---

## Profile & Provider Issues

### 🔴 API Key Not Set

**Error**:
```
Error: API key not set for provider 'anthropic'
Error: No credentials found for 'openrouter'
```

**Solutions**:
```bash
# Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Or use profile
ff-terminal profile set-provider-key anthropic api_key

# Check environment variables
env | grep -i api

# Verify key format
# OpenRouter: sk-or-...
# Anthropic: sk-ant-...
```

### 🟠 Provider Not Supported

**Error**:
```
Error: Unknown provider: 'custom-provider'
```

**Solutions**:
```bash
# Check supported providers
ff-terminal profile providers

# Supported providers:
# - openrouter
# - zai
# - anthropic
# - minimax
# - lmstudio
# - openai-compatible
```

### 🟠 Model Configuration Error

**Error**:
```
Error: Model 'anthropic/claude-3-5-sonnet' not found
```

**Solutions**:
```bash
# Check model availability
ff-terminal profile models

# Update profile with valid model
ff-terminal profile set-model anthropic/claude-3-5-sonnet-20241022

# Check provider model list
# Some models may not be available on all providers
```

---

## Web Interface Issues

### 🔴 Web UI Blank Page

**Error**: Browser shows blank page, no errors

**Solutions**:
```bash
# Verify web client is built
ls -la src/web/client/dist/

# Rebuild if missing
npm run build:web

# Check for JavaScript errors
# Open browser console (F12)

# Verify server is running
curl http://localhost:8787

# Check port
lsof -i:8787
```

### 🟠 WebSocket Disconnects

**Error**:
```
WebSocket disconnected
Error: Connection lost
```

**Solutions**:
```bash
# Enable debug logging
export FF_DEBUG=true

# Check daemon is running
lsof -ti:28888

# Test WebSocket connection
wscat -c ws://localhost:28888

# Check network connection
ping localhost

# Verify no firewall blocking
```

### 🟠 File Upload Fails

**Error**:
```
Error: File upload failed
413 Payload Too Large
```

**Solutions**:
```bash
# Check file size limit
export FF_MAX_UPLOAD_SIZE=52428800  # 50MB

# Upload smaller files

# Check server logs
npm run dev:web 2>&1 | grep -i upload
```

---

## CLI Interface Issues

### 🟠 Ink Rendering Issues

**Error**: UI elements not displaying correctly in terminal

**Solutions**:
```bash
# Check terminal compatibility
# Ink requires ANSI escape codes

# Use compatible terminal
# iTerm2, Alacritty, Kitty, Windows Terminal

# Check TERM environment variable
echo $TERM

# Set TERM to xterm-256color
export TERM=xterm-256color

# Disable truecolor
export TERM=xterm
```

### 🟠 Keyboard Shortcuts Not Working

**Error**: Keyboard shortcuts don't respond

**Solutions**:
```bash
# Check key bindings
# /help shows available shortcuts

# Common shortcuts:
# Tab - Toggle mode
# t - Show thinking
# Ctrl+C - Cancel

# Try different terminal
# Some terminals have key mapping issues

# Check for conflicting shortcuts
# Other programs may intercept keys
```

### 🟠 TTS Not Working

**Error**: Text-to-speech doesn't play audio

**Solutions**:
```bash
# Check TTS is enabled
export FF_TTS_ENABLED=1

# Check voice availability
ff-terminal tts voices

# Set voice
export FF_TTS_VOICE="am_adam"

# Check system audio
# macOS: System Settings → Sound
# Linux: alsamixer

# Check volume
```

---

## macOS-Specific Issues

### 🔴 Keyboard Automation Blocked

**Error**:
```
Error: Keyboard automation not allowed
Error: No accessibility permissions
```

**Solutions**:
```bash
# Grant accessibility permissions
# System Preferences → Privacy & Security → Accessibility
# Add Terminal or iTerm2 to the list

# Or run from allowed terminal
# Restart terminal after granting permissions

# Check permissions
tccutil check AppleEvents
```

### 🟠 Homebrew Path Issues

**Error**: Command not found after Homebrew install

**Solutions**:
```bash
# Add Homebrew to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Source profile
source ~/.zprofile

# Verify installation
which brew
brew --version
```

---

## Linux-Specific Issues

### 🟠 Missing System Dependencies

**Error**:
```
Error: libgtk-3.so.0 not found
Error: Cannot open shared object file
```

**Solutions**:
```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-0 libnss3 libnspr4

# Fedora/RHEL
sudo dnf install gtk3 nss nspr

# Arch
sudo pacman -S gtk3 nss

# For Playwright
npx playwright install-deps
```

### 🟠 PulseAudio Not Running

**Error**:
```
Error: No sound device found
Error: PulseAudio: connection refused
```

**Solutions**:
```bash
# Start PulseAudio
pulseaudio --start

# Check status
pulseaudio --check

# Or use ALSA directly
aplay /path/to/test.wav
```

---

## Docker Issues

### 🟠 Container Won't Start

**Error**:
```
Error: Container exited immediately
Error: OCI runtime create failed
```

**Solutions**:
```bash
# Check container logs
docker logs ff-terminal

# Common fixes:
# - Increase memory limit
# - Fix port mapping
# - Check volume mounts

# Rebuild container
docker-compose down
docker-compose up --build
```

### 🟠 Port Mapping Conflicts

**Error**:
```
Error: Ports already in use
Error: Bind for 0.0.0.0:8787 failed: port is already allocated
```

**Solutions**:
```bash
# Check port usage
lsof -i:8787

# Change port mapping
# In docker-compose.yml:
ports:
  - "8788:8787"  # Use different host port
```

---

## Performance Issues

### 🟠 High Memory Usage

**Error**: System becomes slow, memory warning

**Solutions**:
```bash
# Check memory usage
ps aux | grep ff-terminal

# Reduce concurrent operations
export FF_MAX_PARALLEL_CALLS=5

# Clear session data
rm -rf ~/ff-terminal-workspace/sessions/*

# Restart daemon
pkill -9 -f ff-terminal
npm run dev:daemon
```

### 🟠 Slow Response Times

**Error**: Agent takes too long to respond

**Solutions**:
```bash
# Check model response time
# Different models have different speeds

# Use faster model for testing
export FF_MODEL="anthropic/claude-3-haiku-20240307"

# Check network latency
ping api.anthropic.com

# Reduce context size
# Shorter inputs = faster responses

# Enable caching
export FF_CACHE_ENABLED=true
```

---

## Error Codes Reference

| Code | Error | Solution |
|------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `ECONNREFUSED` | Connection refused | Start daemon/service |
| `ETIMEDOUT` | Operation timed out | Increase timeout or fix cause |
| `EACCES` | Permission denied | Fix file permissions |
| `ENOENT` | File not found | Check path |
| `ENOTFOUND` | Provider not found | Check provider config |
| `401` | Unauthorized | Check API key |
| `429` | Rate limited | Reduce request frequency |
| `413` | Payload too large | Reduce input size |

---

## Diagnostic Commands

### System Information

```bash
# Node.js version
node --version

# npm version
npm --version

# OS information
uname -a  # Linux/macOS
sw_vers  # macOS only

# Memory usage
free -h  # Linux
vm_stat  # macOS

# Disk usage
df -h
```

### FF Terminal Diagnostics

```bash
# Check running processes
ps aux | grep ff-terminal

# Check ports
lsof -i:28888
lsof -i:8787

# Check logs
tail -f ~/ff-terminal-workspace/logs/*.jsonl

# Check profiles
cat ~/Library/Application\ Support/ff-terminal/profiles.json
```

### Network Diagnostics

```bash
# Check DNS resolution
nslookup api.anthropic.com

# Test API connectivity
curl -I https://api.anthropic.com

# Check WebSocket
wscat -c ws://localhost:28888 --echo
```

---

## Getting Help

### Before Filing an Issue

1. Check this troubleshooting guide
2. Search existing issues
3. Gather diagnostic information
4. Reproduce the issue consistently

### Information to Include

When reporting an issue, include:

```bash
# System information
node --version
npm --version
uname -a

# Error message (full)
echo "$ERROR"

# Steps to reproduce
# 1. Step one
# 2. Step two

# Expected behavior
# What should happen

# Actual behavior
# What actually happens

# Logs (if relevant)
# Attach relevant log files
```

### Useful Links

- [GitHub Issues](https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts/issues)
- [Documentation](../../README.md)
- [Testing Guide](03-testing-guide.md)
- [Debugging Guide](06-debugging-guide.md)

---

**Last Updated**: 2026-02-02
