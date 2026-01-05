---
id: applescript_core_tell_application_block
title: AppleScript Core: Basic ''tell application'' Block
description: The fundamental structure for sending commands to a macOS application.
---
tell application "Finder"
  -- Commands for the Finder go here
  set desktopItems to count of items on desktop
  activate -- Brings Finder to the front
  return "Finder has " & desktopItems & " items on the desktop."
end tell
