---
id: calculator_switch_view
title: Calculator: Switch Calculator View
description: >-
  Switches between the different calculator views (Basic, Scientific,
  Programmer).
---
on run {viewMode}
  tell application "Calculator"
    try
      if viewMode is "" or viewMode is missing value then
        set viewMode to "{viewMode}"
      end if
      
      -- Normalize the input
      set viewMode to do shell script "echo " & quoted form of viewMode & " | tr '[:upper:]' '[:lower:]'"
      
      activate
      
      -- Give Calculator time to launch
      delay 1
      
      tell application "System Events"
        tell process "Calculator"
          -- Determine which menu item to click based on the view mode
          if viewMode is "basic" then
            click menu item "Basic" of menu "View" of menu bar 1
            return "Switched to Basic calculator view"
          else if viewMode is "scientific" then
            click menu item "Scientific" of menu "View" of menu bar 1
            return "Switched to Scientific calculator view"
          else if viewMode is "programmer" then
            click menu item "Programmer" of menu "View" of menu bar 1
            return "Switched to Programmer calculator view"
          else
            return "Error: Invalid view mode. Please use 'Basic', 'Scientific', or 'Programmer'."
          end if
        end tell
      end tell
      
    on error errMsg number errNum
      return "Error (" & errNum & "): Failed to switch calculator view - " & errMsg
    end try
  end tell
end run
