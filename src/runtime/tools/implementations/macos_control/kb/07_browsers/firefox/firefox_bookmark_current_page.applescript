---
id: firefox_bookmark_current_page
title: Firefox: Bookmark Current Page
description: >-
  Bookmarks the current page in Firefox, with options to specify folder and add
  tags.
---
on run {input, parameters}
  -- Get parameters (optional)
  set bookmarkFolder to "{folder}"
  set bookmarkTags to "{tags}"
  
  -- If no folder specified, use the default
  if bookmarkFolder is "" then set bookmarkFolder to "Other Bookmarks"
  
  tell application "Firefox"
    activate
    delay 0.3 -- Allow Firefox to activate
  end tell
  
  -- First get the current page title before bookmarking
  set pageTitle to ""
  tell application "System Events"
    tell process "Firefox"
      set frontWindow to first window
      set pageTitle to name of frontWindow
    end tell
  end tell
  
  -- Use keyboard shortcut to bookmark the current page (Command+D)
  tell application "System Events"
    tell process "Firefox"
      keystroke "d" using {command down}
      delay 0.5 -- Wait for bookmark dialog
    end tell
  end tell
  
  -- Interact with the bookmark dialog
  tell application "System Events"
    tell process "Firefox"
      -- Check if bookmark dialog appeared
      if exists (window 1 whose title contains "Bookmark") then
        -- Optional: Change folder if specified
        if bookmarkFolder is not "" and bookmarkFolder is not "Other Bookmarks" then
          -- Find and click the folder dropdown
          set folderMenuButton to button 1 of group 1 of window 1
          click folderMenuButton
          delay 0.3
          
          -- Try to find and select the specified folder
          -- This is a simplified approach - in reality you might need more complex
          -- UI navigating to find the exact menu item
          try
            set folderItems to menu items of menu 1 of folderMenuButton
            repeat with folderItem in folderItems
              if name of folderItem contains bookmarkFolder then
                click folderItem
                exit repeat
              end if
            end repeat
          end try
          delay 0.3
        end if
        
        -- Optional: Add tags if specified
        if bookmarkTags is not "" then
          -- Tab to the tags field and enter tags
          keystroke tab -- Move to Name field
          keystroke tab -- Move to Folder field
          keystroke tab -- Move to Tags field
          delay 0.2
          keystroke bookmarkTags
          delay 0.2
        end if
        
        -- Click Done to save the bookmark
        keystroke return -- Submit the dialog
        delay 0.5
        
        return "Bookmarked \"" & pageTitle & "\""
      else
        return "Bookmark dialog didn't appear or was already bookmarked"
      end if
    end tell
  end tell
end run
