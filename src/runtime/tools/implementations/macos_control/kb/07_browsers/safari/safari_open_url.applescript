---
id: safari_open_url
title: Safari: Open URL
description: >-
  Opens a specified URL in Safari (in the current window or a new window if
  Safari is not already running).
---
{url}

on openUrlInSafari(theUrl)
  if theUrl is missing value or theUrl is "" then
    return "error: URL not provided."
  end if
  
  -- Check if URL has a proper prefix
  if theUrl does not start with "http://" and theUrl does not start with "https://" then
    set theUrl to "https://" & theUrl
  end if
  
  tell application "Safari"
    activate
    try
      open location theUrl
      return "Successfully opened URL in Safari: " & theUrl
    on error errMsg
      return "error: Failed to open URL - " & errMsg
    end try
  end tell
end openUrlInSafari

return my openUrlInSafari("{url}")
