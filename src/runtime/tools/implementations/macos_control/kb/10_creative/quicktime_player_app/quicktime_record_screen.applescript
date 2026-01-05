---
id: quicktime_record_screen
title: QuickTime Player: Record Screen
description: Starts a screen recording using QuickTime Player.
---
tell application "QuickTime Player"
  try
    activate
    
    -- Create a new screen recording
    tell application "System Events"
      tell process "QuickTime Player"
        -- Open the File menu
        click menu "File" of menu bar 1
        
        -- Click on "New Screen Recording" menu item
        click menu item "New Screen Recording" of menu "File" of menu bar 1
        
        -- Wait for the recording interface to appear
        delay 1
        
        return "Screen recording interface launched. Please select the area to record and click the record button."
      end tell
    end tell
    
  on error errMsg number errNum
    return "Error (" & errNum & "): Failed to start screen recording - " & errMsg
  end try
end tell
