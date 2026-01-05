---
id: firefox_toggle_private_browsing
title: Firefox: Toggle Private Browsing
description: >-
  Opens a new Firefox window in private browsing mode or closes the existing
  private browsing window.
---
on run
  -- Check if Firefox is running
  tell application "System Events"
    set firefoxRunning to (exists process "Firefox")
  end tell
  
  if not firefoxRunning then
    tell application "Firefox"
      activate
      delay 1 -- Allow Firefox to launch
    end tell
  end if
  
  tell application "Firefox"
    activate
    delay 0.5 -- Ensure Firefox is active
  end tell
  
  -- Use menu selection to open a new private window
  tell application "System Events"
    tell process "Firefox"
      set frontmost to true
      
      -- Open File menu
      tell menu bar 1
        tell menu bar item "File"
          click
          delay 0.3
          
          -- Click "New Private Window"
          tell menu 1
            set privateWindowMenuItem to menu item "New Private Window"
            if exists privateWindowMenuItem then
              click privateWindowMenuItem
              return "Opened a new Firefox private browsing window"
            end if
          end tell
        end tell
      end tell
    end tell
  end tell
end run
