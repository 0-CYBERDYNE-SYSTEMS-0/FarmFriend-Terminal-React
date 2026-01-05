---
id: system_settings_toggle_dark_mode
title: System Settings: Toggle Dark Mode
description: Toggles between light and dark mode in macOS.
---
try
  tell application "System Events"
    tell appearance preferences
      -- Get current dark mode state
      set currentMode to dark mode
      
      -- Toggle dark mode
      set dark mode to not dark mode
      
      -- Report the change
      if dark mode then
        return "Dark mode enabled"
      else
        return "Light mode enabled"
      end if
    end tell
  end tell
on error errMsg number errNum
  return "Error (" & errNum & "): Failed to toggle dark mode - " & errMsg & "\\n\\nNote: This script requires Accessibility permissions for System Events."
end try
