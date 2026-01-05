---
id: firefox_execute_js_get_result
title: Firefox: Execute JavaScript and Get Result
description: Executes JavaScript in the front tab of Firefox and returns the result.
---
on run {input, parameters}
  set jsCode to "{javascript}"
  
  -- Save the current clipboard content
  set oldClipboard to the clipboard
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
  end tell
  
  -- Open Web Console
  tell application "System Events"
    tell process "Firefox"
      keystroke "k" using {command down, option down}
      delay 1 -- Allow console to open
    end tell
  end tell
  
  -- Clear any existing console content
  tell application "System Events"
    tell process "Firefox"
      keystroke "l" using {command down}
      delay 0.5
    end tell
  end tell
  
  -- Enter and execute JavaScript
  tell application "System Events"
    tell process "Firefox"
      keystroke jsCode
      keystroke return
      delay 0.5 -- Allow execution to complete
      
      -- Select the result (last line in console)
      keystroke "a" using {command down}
      delay 0.2
      keystroke "c" using {command down}
      delay 0.2
    end tell
  end tell
  
  -- Get result from clipboard
  set jsResult to the clipboard
  
  -- Close Web Console
  tell application "System Events"
    tell process "Firefox"
      keystroke "k" using {command down, option down}
    end tell
  end tell
  
  -- Restore the original clipboard content
  set the clipboard to oldClipboard
  
  return jsResult
end run
