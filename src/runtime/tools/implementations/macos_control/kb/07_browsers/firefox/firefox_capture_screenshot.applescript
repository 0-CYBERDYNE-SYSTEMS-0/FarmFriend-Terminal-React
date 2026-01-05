---
id: firefox_capture_screenshot
title: Firefox: Capture Screenshot
description: Captures a screenshot of a webpage using Firefox's built-in screenshot tool.
---
on run {input, parameters}
  -- Get parameters with defaults
  set screenshotType to "{type}" -- "visible", "fullpage", or "element"
  set saveLocation to "{saveLocation}" -- Destination folder
  set fileName to "{fileName}" -- Custom filename
  
  -- Use defaults if not specified
  if screenshotType is "" or screenshotType is "{type}" then
    set screenshotType to "visible"
  end if
  
  if saveLocation is "" or saveLocation is "{saveLocation}" then
    set saveLocation to (path to desktop folder as string)
  end if
  
  if fileName is "" or fileName is "{fileName}" then
    -- Generate a timestamp-based filename
    set currentDate to current date
    set fileName to "Firefox_Screenshot_" & (year of currentDate as string) & "-" & (month of currentDate as integer as string) & "-" & (day of currentDate as string) & "_" & (time string of currentDate)
    -- Replace colons with underscores for valid filename
    set fileName to do shell script "echo " & quoted form of fileName & " | sed 's/:/./g'"
    set fileName to fileName & ".png"
  else
    -- Ensure filename has .png extension
    if fileName does not end with ".png" then
      set fileName to fileName & ".png"
    end if
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
    end tell
  end tell
  
  -- Take screenshot using the menu commands in Developer Tools
  tell application "System Events"
    tell process "Firefox"
      -- First, click the "..." menu in DevTools if it exists
      -- This is where Screenshot is usually found
      
      -- Try to find the kebab menu (three dots) in DevTools
      try
        -- This will depend on Firefox version and UI layout
        -- Find and click the button with the "..." label or similar
        
        -- Open DevTools menu (may vary by Firefox version)
        keystroke "." using {command down, shift down} -- Common shortcut for DevTools options
        delay 0.5
        
        -- Look for "Take a screenshot" option and click it
        set foundScreenshot to false
        
        -- Try to find and click the screenshot option
        -- Loop through menu items to find it
        repeat with menuItem in menu items of menu 1 of front window
          if name of menuItem contains "screenshot" then
            click menuItem
            set foundScreenshot to true
            delay 0.5
            exit repeat
          end if
        end repeat
        
        -- If above method fails, try alternative approach with keyboard
        if not foundScreenshot then
          -- Close the menu with Escape
          key code 53 -- Escape key
          delay 0.3
          
          -- Try using Shift+F2 to open the Developer Toolbar
          key code 120 using {shift down} -- Shift+F2
          delay 0.5
          
          -- Type "screenshot" command
          if screenshotType is "visible" then
            keystroke "screenshot --clipboard"
          else if screenshotType is "fullpage" then
            keystroke "screenshot --fullpage --clipboard"
          else if screenshotType is "element" then
            keystroke "screenshot --selector \"{selector}\" --clipboard"
          end if
          
          keystroke return
          delay 1.5 -- Allow time for the screenshot to be taken
        end if
      on error
        -- If the above approaches fail, try the keyboard shortcut
        -- Press Ctrl+Shift+S which is the Firefox shortcut to take a screenshot in some versions
        keystroke "s" using {control down, shift down}
        delay 0.5
        
        -- Send additional keystrokes based on screenshot type
        if screenshotType is "fullpage" then
          -- Navigate to full page option (might need adjustments)
          keystroke tab
          keystroke tab
          keystroke space
        else if screenshotType is "element" then
          -- Navigate to element selection option (might need adjustments)
          keystroke tab
          keystroke tab
          keystroke tab
          keystroke space
        end if
        
        -- Confirm/save the screenshot
        delay 0.5
        keystroke return
        delay 1 -- Wait for save dialog
      end try
      
      -- Handle the save dialog
      delay 1.5 -- Wait for save dialog to appear
      
      -- Type the file path
      set fullSavePath to saveLocation & fileName
      keystroke "g" using {command down, shift down} -- Open Go to Folder
      delay 0.3
      keystroke saveLocation
      keystroke return
      delay 0.5
      
      -- Type the filename
      keystroke "a" using {command down} -- Select all
      keystroke fileName
      delay 0.3
      
      -- Click Save button
      keystroke return
      delay 1 -- Allow save to complete
    end tell
  end tell
  
  return "Screenshot captured: " & fileName & " saved to " & saveLocation
end run
