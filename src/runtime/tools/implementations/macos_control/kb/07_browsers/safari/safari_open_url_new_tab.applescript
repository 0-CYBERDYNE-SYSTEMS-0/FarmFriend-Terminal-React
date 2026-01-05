---
id: safari_open_url_new_tab
title: Safari: Open URL in New Tab
description: Opens a specified URL in a new tab in Safari.
---
{url}

on openUrlInNewTab(theUrl)
  if theUrl is missing value or theUrl is "" then
    return "error: URL not provided."
  end if
  
  -- Check if URL has a proper prefix
  if theUrl does not start with "http://" and theUrl does not start with "https://" then
    set theUrl to "https://" & theUrl
  end if
  
  tell application "Safari"
    activate
    
    -- Check if Safari has any windows open
    if (count of windows) is 0 then
      -- No windows open, so create a new window with the URL
      try
        make new document with properties {URL:theUrl}
        return "Successfully opened URL in new Safari window: " & theUrl
      on error errMsg
        return "error: Failed to open URL in new window - " & errMsg
      end try
    else
      -- We have at least one window, so create a new tab
      try
        tell front window
          set newTab to make new tab with properties {URL:theUrl}
          set current tab to newTab
          return "Successfully opened URL in new Safari tab: " & theUrl
        end tell
      on error errMsg
        return "error: Failed to open URL in new tab - " & errMsg
      end try
    end if
  end tell
end openUrlInNewTab

return my openUrlInNewTab("{url}")
