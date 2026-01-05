---
id: safari_reload_page
title: Safari: Reload Page
description: Reloads (refreshes) the current page in the active Safari tab.
---
on run
  if not application "Safari" is running then
    return "error: Safari is not running."
  end if
  
  tell application "Safari"
    try
      if (count of documents) is 0 then
        return "error: No documents open in Safari."
      end if
      
      tell front document
        set currentURL to URL
        reload
        return "Successfully reloaded page: " & currentURL
      end tell
    on error errMsg
      return "error: Failed to reload page - " & errMsg
    end try
  end tell
end run
