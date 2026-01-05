---
id: safari_get_front_tab_url
title: Safari: Get URL of Front Tab
description: >-
  Retrieves the web address (URL) of the currently active tab in the frontmost
  Safari window.
---
tell application "Safari"
  if not application "Safari" is running then
    return "error: Safari is not running."
  end if
  try
    if (count of documents) > 0 then
      return URL of front document
    else
      return "error: No documents open in Safari."
    end if
  on error errMsg
    return "error: Could not get Safari URL - " & errMsg
  end try
end tell
