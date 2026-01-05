---
id: chrome_execute_js_get_result
title: Chrome: Execute JavaScript in Active Tab and Get Result
description: >-
  Executes a JavaScript string in the active tab of the frontmost Google Chrome
  window and returns its result.
---
{jsCode}

on executeJsInChrome(javascriptCode)
  if javascriptCode is missing value or javascriptCode is "" then
    return "error: JavaScript code not provided."
  end if

  tell application "Google Chrome"
    if not running then return "error: Google Chrome is not running."
    if (count of windows) is 0 then return "error: No Chrome windows open."
    if (count of tabs of front window) is 0 then return "error: No active tab in front Chrome window."
    
    activate
    delay 0.2
    try
      set jsResult to execute active tab of front window javascript javascriptCode
      if jsResult is missing value then
        return "JavaScript executed in Chrome. No explicit return value from JS."
      else
        return jsResult
      end if
    on error errMsg number errNum
      return "error (Chrome JS - " & errNum & "): " & errMsg & ". Ensure 'Allow JavaScript from Apple Events' is enabled in Chrome's View > Developer menu."
    end try
  end tell
end executeJsInChrome

return my executeJsInChrome("{jsCode}")
