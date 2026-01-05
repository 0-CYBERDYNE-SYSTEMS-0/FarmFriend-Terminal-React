---
id: system_screen_lock
title: System Screen Lock
description: >-
  Locks the screen on macOS using keyboard shortcut simulation or login window
  accessibility
---
tell application "System Events" to keystroke "q" using {control down, command down}
