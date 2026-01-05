---
id: firefox_responsive_design_mode
title: Firefox: Responsive Design Mode
description: >-
  Opens Firefox's Responsive Design Mode for testing websites on different
  screen sizes and devices.
---
on run {input, parameters}
  -- Get parameters
  set devicePreset to "{device}" -- e.g., "iPhone X", "iPad", "Galaxy S9"
  set customWidth to "{width}" -- Custom width in pixels
  set customHeight to "{height}" -- Custom height in pixels
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
  end tell
  
  -- Toggle Responsive Design Mode with keyboard shortcut (Command+Option+M)
  tell application "System Events"
    tell process "Firefox"
      keystroke "m" using {command down, option down}
      delay 1 -- Allow Responsive Design Mode to open
    end tell
  end tell
  
  -- If no device or dimensions specified, we're done
  if (devicePreset is "" or devicePreset is "{device}") and ¬
     (customWidth is "" or customWidth is "{width}") and ¬
     (customHeight is "" or customHeight is "{height}") then
    return "Toggled Firefox Responsive Design Mode"
  end if
  
  -- Set device preset or custom dimensions if specified
  tell application "System Events"
    tell process "Firefox"
      -- First, check if we need to set a specific device preset
      if devicePreset is not "" and devicePreset is not "{device}" then
        -- Click on the device selector dropdown
        -- This part may need adjustment based on Firefox UI
        
        -- Look for the device selector dropdown in Responsive Design Mode
        delay 0.5
        
        -- Try to find and click the device type dropdown
        set deviceDropdownFound to false
        
        -- Attempt to find and click the device dropdown
        try
          -- Look for a popup button that might be the device selector
          repeat with btn in (UI elements of front window whose role is "AXPopUpButton")
            if description of btn contains "Device" or ¬
               description of btn contains "Responsive" then
              click btn
              set deviceDropdownFound to true
              delay 0.5
              exit repeat
            end if
          end repeat
          
          -- If dropdown found, try to select the device preset
          if deviceDropdownFound then
            -- Look through menu items for matching device
            set deviceFound to false
            
            repeat with menuItem in menu items of menu 1 of front window
              if name of menuItem contains devicePreset then
                click menuItem
                set deviceFound to true
                delay 0.5
                exit repeat
              end if
            end repeat
            
            if not deviceFound then
              -- Close dropdown if device not found
              keystroke escape
            end if
          end if
        end try
      end if
      
      -- Set custom dimensions if specified
      if (customWidth is not "" and customWidth is not "{width}") and ¬
         (customHeight is not "" and customHeight is not "{height}") then
        
        -- Try to find and click the custom dimensions input field
        delay 0.5
        
        -- This is a simplified version - actual UI navigation may need adjustment
        -- Try to find width input field
        try
          -- Attempt to locate input fields for width and height
          repeat with textField in (UI elements of front window whose role is "AXTextField")
            if description of textField contains "Width" then
              -- Found width field, click and enter value
              click textField
              keystroke "a" using {command down} -- Select all
              keystroke customWidth
              keystroke tab -- Move to height field
              keystroke "a" using {command down} -- Select all
              keystroke customHeight
              keystroke return -- Apply dimensions
              exit repeat
            end if
          end repeat
        end try
      end if
    end tell
  end tell
  
  -- Return appropriate message based on what was set
  if devicePreset is not "" and devicePreset is not "{device}" then
    if (customWidth is not "" and customWidth is not "{width}") and ¬
       (customHeight is not "" and customHeight is not "{height}") then
      return "Firefox Responsive Design Mode activated with device preset '" & devicePreset & "' and custom dimensions " & customWidth & "×" & customHeight
    else
      return "Firefox Responsive Design Mode activated with device preset '" & devicePreset & "'"
    end if
  else if (customWidth is not "" and customWidth is not "{width}") and ¬
          (customHeight is not "" and customHeight is not "{height}") then
    return "Firefox Responsive Design Mode activated with custom dimensions " & customWidth & "×" & customHeight
  else
    return "Firefox Responsive Design Mode activated"
  end if
end run
