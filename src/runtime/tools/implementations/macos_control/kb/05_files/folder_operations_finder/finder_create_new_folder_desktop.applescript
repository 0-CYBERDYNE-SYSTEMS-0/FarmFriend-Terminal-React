---
id: finder_create_new_folder_desktop
title: Create New Folder on Desktop
description: Creates a new folder on the desktop with a specified name
---
-- Define folder name (can be replaced with {folderName} placeholder)
set folderName to "{folderName}" 

if folderName is missing value or folderName is "" then
  set folderName to "New Folder"
end if

tell application "Finder"
  -- Get reference to the desktop
  set desktopPath to path to desktop folder
  
  -- Create a new folder on the desktop
  try
    -- Check if folder already exists
    if exists folder folderName of desktopPath then
      return "Error: A folder named '" & folderName & "' already exists on the desktop."
    end if
    
    -- Create the new folder
    set newFolder to make new folder at desktopPath with properties {name:folderName}
    
    -- Return the path of the new folder
    return "Created folder: " & (POSIX path of (newFolder as alias))
  on error errMsg
    return "Error creating folder: " & errMsg
  end try
end tell
