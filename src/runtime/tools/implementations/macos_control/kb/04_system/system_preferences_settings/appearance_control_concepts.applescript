---
id: appearance/control/concepts
title: Control macOS Appearance Settings with AppleScript
description: >-
  Change and manage macOS appearance settings including dark mode, accent
  colors, and highlight colors using AppleScript and UI scripting
---
tell application "System Settings"
  activate
  delay 1 -- Give time for the app to fully load
  
  -- Navigate to Appearance settings
  tell application "System Events"
    tell process "System Settings"
      -- Click on Appearance in the sidebar
      click button "Appearance" of scroll area 1 of group 1 of window 1
      
      -- Wait for the panel to load
      delay 0.5
      
      -- Here we toggle between "Light" and "Dark" using the radio buttons
      -- Find the radio buttons in the appearance section
      set appearanceOptions to radio buttons of radio group 1 of group 1 of scroll area 1 of group 1 of window 1
      
      -- Get the radio button names (could be "Light", "Dark", "Auto")
      set optionNames to name of appearanceOptions
      
      -- Toggle to Dark Mode
      click radio button "Dark" of radio group 1 of group 1 of scroll area 1 of group 1 of window 1
      
      -- Or toggle to Light Mode
      -- click radio button "Light" of radio group 1 of group 1 of scroll area 1 of group 1 of window 1
      
      -- Or set to Auto
      -- click radio button "Auto" of radio group 1 of group 1 of scroll area 1 of group 1 of window 1
      
      delay 0.5 -- Wait for the setting to apply
    end tell
  end tell
  
  quit
end tell
