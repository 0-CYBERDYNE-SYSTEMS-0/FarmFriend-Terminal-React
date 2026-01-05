---
id: firefox_switch_to_tab_by_title
title: Firefox: Switch to Tab by Title
description: Switches to a Firefox tab based on its title or partial title match.
---
on run {input, parameters}
  -- Get the tab title to search for
  set searchTitle to "{tabTitle}"
  
  -- Exit if no search title provided
  if searchTitle is "" then
    return "Error: No tab title to search for was provided"
  end if
  
  tell application "Firefox"
    activate
    delay 0.3 -- Allow Firefox to activate
  end tell
  
  -- First list all tabs using the tab overview
  set tabsList to {}
  
  tell application "System Events"
    tell process "Firefox"
      -- Open tab overview
      keystroke "," using {shift down, command down}
      delay 0.7 -- Allow overview to appear
      
      -- Get list of tab titles
      set tabElements to UI elements of group 1 of window 1 whose role is "AXStaticText"
      
      -- Extract tabs information
      repeat with tabElement in tabElements
        set tabName to value of tabElement
        if tabName is not "" and tabName is not "Tabs" then
          copy {title:tabName, element:tabElement} to end of tabsList
        end if
      end repeat
      
      -- Look for a matching tab
      set foundMatch to false
      set exactMatch to missing value
      set partialMatch to missing value
      
      repeat with tabInfo in tabsList
        set tabTitle to title of tabInfo
        set tabElement to element of tabInfo
        
        -- Check for an exact match first (case-insensitive)
        if tabTitle's lowercase is equal to searchTitle's lowercase then
          set exactMatch to tabElement
          exit repeat
        end if
        
        -- Check for a partial match
        if tabTitle's lowercase contains searchTitle's lowercase then
          set partialMatch to tabElement
        end if
      end repeat
      
      -- First try to use exact match if found
      if exactMatch is not missing value then
        click exactMatch
        set foundMatch to true
      else if partialMatch is not missing value then
        -- Otherwise use first partial match
        click partialMatch
        set foundMatch to true
      end if
      
      -- Close the tab overview if no match was found
      if not foundMatch then
        keystroke escape
        return "No tab with title containing \"" & searchTitle & "\" was found."
      end if
    end tell
  end tell
  
  return "Switched to tab matching \"" & searchTitle & "\""
end run
