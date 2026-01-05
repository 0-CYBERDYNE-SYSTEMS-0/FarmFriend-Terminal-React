---
id: firefox_refresh_page
title: Firefox: Refresh Current Page
description: Refreshes (reloads) the current page in Firefox.
---
on run {input, parameters}
  -- Default to standard refresh
  set forceRefresh to false
  
  -- Check if input parameter requests force refresh
  if input is not {} then
    if input as string is "force" then
      set forceRefresh to true
    end if
  end if
  
  tell application "Firefox"
    activate
    delay 0.3 -- Allow Firefox to activate
  end tell
  
  tell application "System Events"
    tell process "Firefox"
      if forceRefresh then
        -- Force refresh (Command+Shift+R)
        keystroke "r" using {command down, shift down}
      else
        -- Standard refresh (Command+R)
        keystroke "r" using {command down}
      end if
    end tell
  end tell
  
  if forceRefresh then
    return "Force refreshed the current Firefox page (bypassing cache)"
  else
    return "Refreshed the current Firefox page"
  end if
end run
