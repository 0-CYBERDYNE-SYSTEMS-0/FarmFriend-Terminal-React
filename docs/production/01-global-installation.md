# Global Installation

**Install FF Terminal system-wide for production use**

---

## Overview

Global installation makes `ff-terminal` available as a system command, accessible from any directory without reference to the repository. Required for production deployments, scheduled tasks, and headless execution.

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** (bundled with Node.js)
- **Git** (for cloning source)
- POSIX-compliant shell (bash, zsh, fish)

---

## Installation Methods

### Method 1: Script Installation (Recommended)

Automated installation script handles building, linking, and PATH configuration.

```bash
# Clone repository
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts

# Install dependencies
npm install

# Build project
npm run build

# Run installation script
./scripts/install-cli.sh

# Add to PATH (add to ~/.zprofile, ~/.bashrc, or ~/.config/fish/config.fish)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

**What the script does:**
1. Creates `~/.local/bin/` if missing
2. Copies `dist/bin/ff-terminal.js` to `~/.local/bin/ff-terminal`
3. Sets executable permissions (`chmod +x`)
4. Verifies installation

### Method 2: Manual Installation

Full control over installation location and permissions.

```bash
# Clone and build
git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
cd ff-terminal-ts
npm install
npm run build

# Create target directory
mkdir -p ~/.local/bin

# Copy compiled binary
cp dist/bin/ff-terminal.js ~/.local/bin/ff-terminal

# Set executable
chmod +x ~/.local/bin/ff-terminal

# Add to PATH (bash/zsh)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
which ff-terminal
```

### Method 3: npm Link (Development)

For active development with live code updates.

```bash
# In project directory
cd ff-terminal-ts

# Create global symlink
npm link

# Verify
ff-terminal --help

# Unlink later
npm unlink -g ff-terminal-ts
```

**Note:** `npm link` uses the `bin` field from `package.json` to create the symlink. Rebuild with `npm run build` after code changes.

---

## Verification

Test installation across different directories:

```bash
# Check version
ff-terminal --version

# Display help
ff-terminal --help

# Test from different directory
cd /tmp
ff-terminal --version

# Check executable location
which ff-terminal
# Should output: /home/user/.local/bin/ff-terminal
```

---

## System-Wide vs User Installation

### User Installation (Default)

Installs to `~/.local/bin/`, accessible only to current user.

```bash
./scripts/install-cli.sh
# Installs to: ~/.local/bin/ff-terminal
```

**Pros:**
- No sudo required
- Isolated from system packages
- Easy to uninstall

**Cons:**
- Not available to other users
- PATH must be configured per user

### System-Wide Installation

Installs to `/usr/local/bin/`, accessible to all users.

```bash
# Build first
npm run build

# Copy with sudo
sudo cp dist/bin/ff-terminal.js /usr/local/bin/ff-terminal
sudo chmod +x /usr/local/bin/ff-terminal

# Verify
which ff-terminal
# Should output: /usr/local/bin/ff-terminal
```

**Pros:**
- Available to all users
- No PATH configuration needed

**Cons:**
- Requires sudo privileges
- System-wide changes
- Harder to uninstall cleanly

---

## Configuration

After installation, configure FF Terminal for production use:

```bash
# Initialize workspace
ff-terminal init

# Setup profile
ff-terminal profile setup

# List profiles
ff-terminal profile list

# Set default profile
ff-terminal profile default production
```

---

## Uninstallation

### User Installation

```bash
# Remove binary
rm ~/.local/bin/ff-terminal

# Remove PATH configuration from shell profile
# Edit ~/.zprofile, ~/.bashrc, or ~/.config/fish/config.fish
# Remove the line: export PATH="$HOME/.local/bin:$PATH"

# Optionally remove workspace
rm -rf ~/ff-terminal-workspace
```

### System-Wide Installation

```bash
# Remove binary (requires sudo)
sudo rm /usr/local/bin/ff-terminal

# Optionally remove workspace (per-user)
rm -rf ~/ff-terminal-workspace
```

### npm Link

```bash
# Unlink from global namespace
npm unlink -g ff-terminal-ts
```

---

## Troubleshooting

### Command Not Found

```bash
# Check if binary exists
ls -la ~/.local/bin/ff-terminal

# Check PATH
echo $PATH | grep -o ".local/bin"

# Manual PATH addition
export PATH="$HOME/.local/bin:$PATH"
```

### Permission Denied

```bash
# Fix executable permissions
chmod +x ~/.local/bin/ff-terminal

# If using system-wide installation
sudo chmod +x /usr/local/bin/ff-terminal
```

### Version Mismatch

```bash
# Rebuild from source
cd ff-terminal-ts
npm run build
./scripts/install-cli.sh

# Verify new version
ff-terminal --version
```

### Build Errors

```bash
# Clean build artifacts
rm -rf dist node_modules/.cache

# Reinstall dependencies
npm install

# Full rebuild
npm run build

# Reinstall
./scripts/install-cli.sh
```

---

## Post-Installation Checklist

- [ ] `ff-terminal --version` works from any directory
- [ ] `which ff-terminal` shows correct path
- [ ] Workspace initialized (`~/ff-terminal-workspace/` exists)
- [ ] At least one profile configured
- [ ] Default profile set
- [ ] Test headless execution works: `ff-terminal run --prompt "test" --headless`

---

## Advanced: Multiple Versions

Install multiple versions side-by-side for testing:

```bash
# Install version A
cd ff-terminal-v1
npm run build
cp dist/bin/ff-terminal.js ~/.local/bin/ff-terminal-v1
chmod +x ~/.local/bin/ff-terminal-v1

# Install version B
cd ff-terminal-v2
npm run build
cp dist/bin/ff-terminal.js ~/.local/bin/ff-terminal-v2
chmod +x ~/.local/bin/ff-terminal-v2

# Create symlink for default version
ln -sf ~/.local/bin/ff-terminal-v2 ~/.local/bin/ff-terminal

# Switch versions
ln -sf ~/.local/bin/ff-terminal-v1 ~/.local/bin/ff-terminal
```

---

## CI/CD Integration

For automated deployments in CI/CD pipelines:

```yaml
# .github/workflows/deploy.yml
- name: Install FF Terminal
  run: |
    git clone https://github.com/0-CYBERDYNE-SYSTEMS-0/ff-terminal-ts.git
    cd ff-terminal-ts
    npm ci
    npm run build
    sudo cp dist/bin/ff-terminal.js /usr/local/bin/ff-terminal
    sudo chmod +x /usr/local/bin/ff-terminal

- name: Verify Installation
  run: ff-terminal --version
```

---

## Summary

| Method | Location | Use Case |
|--------|----------|----------|
| Script | `~/.local/bin/` | Standard production installation |
| Manual | `~/.local/bin/` or `/usr/local/bin/` | Custom configuration |
| npm Link | Global npm registry | Development and testing |

**Recommended:** Script installation to `~/.local/bin/` for most production use cases.
