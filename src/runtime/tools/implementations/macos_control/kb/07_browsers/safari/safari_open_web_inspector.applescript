---
id: safari_open_web_inspector
title: Safari: Open Web Inspector
description: Opens the Web Inspector (Developer Tools) for the current tab in Safari.
---
on run
  if not application "Safari" is running then
    return "error: Safari is not running."
  end if
  
  tell application "Safari"
    if (count of windows) is 0 or (count of tabs of front window) is 0 then
      return "error: No tabs open in Safari."
    end if
    
    activate
    delay 0.5
    
    try
      -- First attempt: Use keyboard shortcut (Command+Option+I)
      tell application "System Events"
        tell process "Safari"
          keystroke "i" using {command down, option down}
          delay 0.5
        end tell
      end tell
      
      -- Check if the keystroke approach failed (fall back to menu)
      tell application "System Events"
        if not (window "Web Inspector" of process "Safari" exists) then
          -- Second attempt: Use menu items
          tell process "Safari"
            -- Verify Develop menu exists
            if not (menu bar item "Develop" of menu bar 1 exists) then
              return "error: Develop menu not enabled in Safari. Enable it in Safari > Preferences > Advanced."
            end if
            
            -- Click Develop > Show Web Inspector
            click menu bar item "Develop" of menu bar 1
            delay 0.2
            click menu item "Show Web Inspector" of menu of menu bar item "Develop" of menu bar 1
          end tell
        end if
      end tell
      
      return "Successfully opened Web Inspector for the current tab."
    on error errMsg
      return "error: Failed to open Web Inspector - " & errMsg & ". Make sure the Develop menu is enabled in Safari preferences."
    end try
  end tell
end run
