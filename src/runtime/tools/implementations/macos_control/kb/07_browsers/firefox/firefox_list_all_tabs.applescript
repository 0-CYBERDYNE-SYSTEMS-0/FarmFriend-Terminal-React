---
id: firefox_list_all_tabs
title: Firefox: List All Tabs
description: Lists all open tabs in the frontmost Firefox window using UI scripting.
---
on run
  -- Initialize empty list for tab information
  set tabsList to {}
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate fully
  end tell
  
  -- Open the tab list menu
  tell application "System Events"
    tell process "Firefox"
      -- Click the tab list button
      keystroke "," using {shift down, command down} -- Keyboard shortcut for tab list
      delay 0.5 -- Allow menu to appear
      
      -- Get tab list
      set tabElements to UI elements of group 1 of window 1 whose role is "AXStaticText"
      
      -- Extract tab information
      repeat with tabElement in tabElements
        set tabName to value of tabElement
        if tabName is not "" and tabName is not "Tabs" then
          copy tabName to end of tabsList
        end if
      end repeat
      
      -- Close the tab list
      keystroke escape
    end tell
  end tell
  
  return tabsList
end run
