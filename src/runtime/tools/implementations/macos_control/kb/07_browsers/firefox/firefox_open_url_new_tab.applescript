---
id: firefox_open_url_new_tab
title: Firefox: Open URL in New Tab
description: Opens a specified URL in a new tab in Firefox.
---
on run {input, parameters}
  set theURL to "{url}"
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
    
    -- Open a new tab using keyboard shortcut
    tell application "System Events" to keystroke "t" using command down
    delay 0.5 -- Allow the tab to open
    
    -- Now load the URL
    OpenURL theURL
  end tell
  
  return "Opened " & theURL & " in a new Firefox tab"
end run
