---
id: memory/mouse/concepts
title: Control Mouse, Trackpad, and Memory Settings with AppleScript
description: >-
  Scripts for controlling mouse/trackpad tracking speed, scrolling behavior, and
  checking system memory status in macOS
---
tell application "System Settings"
  activate
  delay 1
  
  tell application "System Events"
    tell process "System Settings"
      -- Click on Mouse in the sidebar
      click button "Mouse" of scroll area 1 of group 1 of window 1
      delay 0.5
      
      -- Adjust tracking speed slider
      -- Find the tracking speed slider
      set trackingSlider to slider 1 of group 1 of scroll area 1 of group 1 of window 1
      
      -- Set to a specific value (range is typically 0.0 to 1.0)
      set value of trackingSlider to 0.7
      
      delay 0.5
    end tell
  end tell
  
  quit
end tell
