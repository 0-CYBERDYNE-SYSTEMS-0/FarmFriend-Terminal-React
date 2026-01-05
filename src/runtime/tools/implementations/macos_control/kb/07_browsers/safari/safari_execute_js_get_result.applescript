---
id: safari_execute_js_get_result
title: Safari: Execute JavaScript in Front Tab and Get Result
description: >-
  Executes a JavaScript string in the frontmost Safari document and returns its
  result.
---
{jsCode}

on executeJsInSafari(javascriptCode)
  if javascriptCode is missing value or javascriptCode is "" then
    return "error: JavaScript code not provided."
  end if

  tell application "Safari"
    if not running then return "error: Safari is not running."
    if (count of documents) is 0 then return "error: No document open in Safari."
    
    activate
    delay 0.2
    try
      set jsResult to do JavaScript javascriptCode in front document
      if jsResult is missing value then
        return "JavaScript executed in Safari. No explicit return value from JS."
      else
        return jsResult
      end if
    on error errMsg number errNum
      return "error (Safari JS - " & errNum & "): " & errMsg & ". Ensure 'Allow JavaScript from Apple Events' is enabled in Safari's Develop menu."
    end try
  end tell
end executeJsInSafari

return my executeJsInSafari("{jsCode}")
