---
id: chrome_open_url_new_tab_profile
title: Chrome: Open URL in New Tab (Specific Profile)
description: >-
  Opens a specified URL in Google Chrome, potentially in a specific user
  profile, creating a new tab if Chrome is already open.
---
{targetURL}
{profileDir}
{newWindow}

on openInChrome(theURL, profileName, useNewWindow)
  if theURL is missing value or theURL is "" then return "error: URL not provided."
  
  if profileName is not missing value and profileName is not "" then
    try
      set chromeArgs to "--args"
      if useNewWindow is true then
         set chromeArgs to "-n " & chromeArgs -- -n for new instance/window
      end if
      do shell script "open -b com.google.Chrome " & chromeArgs & " --profile-directory=" & quoted form of profileName & " " & quoted form of theURL
      return "Attempted to open " & theURL & " in Chrome profile: " & profileName
    on error errMsg
      return "error: Could not open Chrome with profile '" & profileName & "': " & errMsg
    end try
  else
    tell application "Google Chrome"
      if not running then
        run
        delay 1
      end if
      activate
      if (count of windows) is 0 or useNewWindow is true then
        make new window with properties {URL:theURL}
      else
        tell front window
          make new tab at after (get active tab) with properties {URL:theURL}
        end tell
      end if
      return "Opened " & theURL & " in Chrome."
    on error errMsg
      return "error: Failed to open URL in Chrome - " & errMsg
    end try
  end if
end openInChrome

return my openInChrome("{targetURL}", "{profileDir}", {newWindow})
