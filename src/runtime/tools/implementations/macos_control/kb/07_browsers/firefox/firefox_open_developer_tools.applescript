---
id: firefox_open_developer_tools
title: Firefox: Open Developer Tools
description: >-
  Opens Firefox Developer Tools, optionally focusing on a specific panel
  (Elements, Console, Network, etc.).
---
on run {input, parameters}
  -- Get the DevTools panel to focus (optional)
  set devToolsPanel to "{panel}"
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
  end tell
  
  -- If no panel specified, just open the default DevTools
  if devToolsPanel is "" or devToolsPanel is "{panel}" then
    tell application "System Events"
      tell process "Firefox"
        -- Use F12 to open Developer Tools
        key code 111 -- F12
      end tell
    end tell
    
    return "Opened Firefox Developer Tools"
  end if
  
  -- First open DevTools with F12
  tell application "System Events"
    tell process "Firefox"
      key code 111 -- F12
      delay 1 -- Allow DevTools to open
    end tell
  end tell
  
  -- Now switch to the specific panel based on input
  set panelFound to true
  
  tell application "System Events"
    tell process "Firefox"
      -- Convert panel name to lowercase to make case insensitive
      set panelLower to lowercase of devToolsPanel
      
      if panelLower is "elements" or panelLower is "inspector" then
        -- Open Elements panel (Command+Option+C)
        keystroke "c" using {command down, option down}
        set panelName to "Elements/Inspector"
        
      else if panelLower is "console" then
        -- Open Console panel (Command+Option+K)
        keystroke "k" using {command down, option down}
        set panelName to "Console"
        
      else if panelLower is "debugger" or panelLower is "sources" then
        -- Open Debugger panel (Command+Option+S)
        keystroke "s" using {command down, option down}
        set panelName to "Debugger/Sources"
        
      else if panelLower is "network" then
        -- Open Network panel (Command+Option+E)
        keystroke "e" using {command down, option down}
        set panelName to "Network"
        
      else if panelLower is "performance" then
        -- Open Performance panel (Shift+F5)
        key code 96 using {shift down} -- Shift+F5
        set panelName to "Performance"
        
      else if panelLower is "memory" then
        -- Open Memory panel
        -- This might need manual navigation in some Firefox versions
        keystroke "m" using {command down, option down}
        set panelName to "Memory"
        
      else if panelLower is "storage" then
        -- Open Storage panel
        keystroke "l" using {command down, option down}
        set panelName to "Storage"
        
      else
        -- If panel not recognized, just leave DevTools open on default panel
        set panelFound to false
        set panelName to "default"
      end if
    end tell
  end tell
  
  if panelFound then
    return "Opened Firefox Developer Tools with " & panelName & " panel"
  else
    return "Opened Firefox Developer Tools (panel '" & devToolsPanel & "' not recognized)"
  end if
end run
