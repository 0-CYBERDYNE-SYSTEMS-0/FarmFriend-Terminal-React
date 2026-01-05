---
id: firefox_close_current_tab
title: Firefox: Close Current Tab
description: Closes the currently active tab in Firefox.
---
on run
  tell application "Firefox"
    activate
    delay 0.3 -- Allow Firefox to activate
  end tell
  
  tell application "System Events"
    tell process "Firefox"
      -- Use the standard shortcut to close a tab (Command+W)
      keystroke "w" using {command down}
    end tell
  end tell
  
  return "Closed the current Firefox tab"
end run
