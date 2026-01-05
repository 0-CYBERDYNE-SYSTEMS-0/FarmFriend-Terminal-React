---
id: chrome_execute_javascript
title: Chrome: Execute JavaScript in Active Tab
description: >-
  Executes a provided JavaScript string in the active tab of the frontmost
  Google Chrome window.
---
{jsCode}

on executeJSInChrome(javascriptCode)
  if javascriptCode is missing value or javascriptCode is "" then
    return "error: No JavaScript code provided."
  end if

  tell application "Google Chrome"
    if not running then return "error: Google Chrome is not running."
    if (count of windows) is 0 then return "error: No Chrome windows open."
    if (count of tabs of front window) is 0 then return "error: No tabs in front Chrome window."
    
    try
      -- Make sure Chrome is front for reliability of JS execution context
      activate
      delay 0.2
      set jsResult to execute active tab of front window javascript javascriptCode
      if jsResult is missing value then
        return "JavaScript executed. No explicit return value from JS."
      else
        return jsResult
      end if
    on error errMsg number errNum
      if errNum is -1728 then -- Often "Can't make some data into the expected type." if JS is invalid or page context issue
        return "error: Chrome JavaScript execution error (" & errNum & "): " & errMsg & ". Check JS syntax and if 'Allow JavaScript from Apple Events' is enabled in Chrome's Develop menu."
      else
        return "error: Chrome JavaScript execution error (" & errNum & "): " & errMsg
      end if
    end try
  end tell
end executeJSInChrome

return my executeJSInChrome("{jsCode}")
