---
id: firefox_network_throttling
title: Firefox: Network Throttling
description: >-
  Controls Firefox's network throttling feature in Developer Tools to simulate
  various internet connection speeds.
---
on run {input, parameters}
  -- Get throttling profile to use
  set throttleProfile to "{profile}"
  
  -- Set default if not specified
  if throttleProfile is "" or throttleProfile is "{profile}" then
    set throttleProfile to "Online" -- Default to normal connection
  end if
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
  end tell
  
  -- Open Developer Tools if not already open
  tell application "System Events"
    tell process "Firefox"
      key code 111 -- F12 to open Developer Tools
      delay 1 -- Allow DevTools to open
      
      -- Make sure we're on the Network panel
      keystroke "e" using {command down, option down}
      delay 0.5 -- Allow Network panel to activate
    end tell
  end tell
  
  -- Define throttling profiles (these are Firefox's standard options)
  -- Profile name, Display name (for UI matching)
  set throttlingProfiles to {¬
    {"offline", "Offline"}, ¬
    {"2g", "2G"}, ¬
    {"3g", "3G"}, ¬
    {"4g", "4G"}, ¬
    {"lte", "LTE"}, ¬
    {"edge", "Edge"}, ¬
    {"gprs", "GPRS"}, ¬
    {"slow", "Slow 3G"}, ¬
    {"dial", "Dial-up"}, ¬
    {"wifi", "WiFi"}, ¬
    {"online", "No throttling"}, ¬
    {"none", "No throttling"}, ¬
    {"normal", "No throttling"} ¬
  }
  
  -- Convert input to lowercase for matching
  set throttleProfileLower to do shell script "echo " & quoted form of throttleProfile & " | tr '[:upper:]' '[:lower:]'"
  
  -- Find matching profile display name
  set profileDisplayName to "No throttling" -- Default
  
  repeat with profile in throttlingProfiles
    set profileKey to item 1 of profile
    if profileKey is throttleProfileLower then
      set profileDisplayName to item 2 of profile
      exit repeat
    end if
  end repeat
  
  -- Set the throttling option via UI interaction
  tell application "System Events"
    tell process "Firefox"
      -- Look for the throttling dropdown in the Network panel
      try
        -- Find and click the throttling dropdown
        -- This is simplified and may need adjustment based on Firefox version
        
        -- Method 1: Try to find the throttling menu button
        set foundThrottlingDropdown to false
        
        -- Look for popup buttons in the toolbar
        repeat with btn in (UI elements of toolbar 1 of front window whose role is "AXPopUpButton")
          -- Check if this might be the throttling dropdown
          if description of btn contains "throttling" or name of btn contains "throttling" then
            click btn
            set foundThrottlingDropdown to true
            delay 0.5 -- Wait for dropdown to open
            exit repeat
          end if
        end repeat
        
        -- If dropdown found, try to select the profile
        if foundThrottlingDropdown then
          -- Look for menu item matching our profile name
          set foundThrottlingOption to false
          
          repeat with menuItem in (menu items of menu 1 of front window)
            if name of menuItem contains profileDisplayName then
              click menuItem
              set foundThrottlingOption to true
              exit repeat
            end if
          end repeat
          
          if not foundThrottlingOption then
            -- Close dropdown if option not found
            keystroke escape
          end if
        else
          -- Method 2: Try using the Network panel settings menu
          -- Click the Network settings (gear icon) button
          
          -- Look for a button that might be the settings
          repeat with btn in (UI elements of front window whose role is "AXButton")
            if description of btn contains "settings" or description of btn contains "gear" then
              click btn
              delay 0.5 -- Wait for menu to open
              
              -- Now look for throttling option in the menu
              repeat with menuItem in (menu items of menu 1 of front window)
                if name of menuItem contains "Throttling" then
                  click menuItem
                  delay 0.3 -- Wait for submenu
                  
                  -- Try to find our profile in the submenu
                  repeat with subMenuItem in (menu items of menu 1 of menuItem)
                    if name of subMenuItem contains profileDisplayName then
                      click subMenuItem
                      set foundThrottlingOption to true
                      exit repeat
                    end if
                  end repeat
                  
                  exit repeat
                end if
              end repeat
              
              exit repeat
            end if
          end repeat
        end if
      on error
        -- Fallback method: Use keyboard navigation
        -- Open the Network panel settings
        keystroke "," using {shift down, command down}
        delay 0.5
        
        -- Tab to throttling dropdown (may need adjustment)
        repeat 5 times
          keystroke tab
          delay 0.1
        end repeat
        
        -- Open dropdown
        keystroke space
        delay 0.3
        
        -- Navigate to desired option (highly dependent on Firefox version)
        -- This is simplified and may need customization
        if throttleProfileLower is "offline" then
          keystroke "o" -- Jump to Offline
        else if throttleProfileLower is "3g" then
          keystroke "3" -- Jump to 3G
        else if throttleProfileLower is "online" or throttleProfileLower is "none" then
          keystroke "n" -- Jump to No throttling
        end if
        
        delay 0.2
        keystroke return -- Select option
      end try
    end tell
  end tell
  
  return "Firefox network throttling set to: " & profileDisplayName
end run
