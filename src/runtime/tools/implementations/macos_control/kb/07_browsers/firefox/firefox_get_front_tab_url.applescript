---
id: firefox_get_front_tab_url
title: Firefox: Get URL of Front Tab
description: >-
  Retrieves the URL of the active tab in the frontmost Firefox window using UI
  scripting.
---
use scripting additions

-- Save the current clipboard content
set oldClipboard to the clipboard

tell application "Firefox"
  activate
  -- Allow Firefox to come to the foreground
  delay 0.5
end tell

-- Use keyboard shortcuts to select and copy the URL
tell application "System Events"
  tell process "Firefox"
    keystroke "l" using {command down}
    delay 0.2
    keystroke "c" using {command down}
    delay 0.2
  end tell
end tell

-- Get the URL from the clipboard
set theURL to the clipboard

-- Restore the original clipboard content
set the clipboard to oldClipboard

return theURL
