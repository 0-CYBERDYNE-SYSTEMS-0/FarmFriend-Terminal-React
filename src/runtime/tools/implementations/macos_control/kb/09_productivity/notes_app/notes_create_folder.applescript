---
id: notes_create_folder
title: Notes: Create New Folder
description: Creates a new folder in the Notes app.
---
on run {folderName}
  tell application "Notes"
    try
      -- Handle placeholder substitution
      if folderName is "" or folderName is missing value then
        set folderName to "{folderName}"
      end if
      
      -- Check if folder already exists
      if exists folder folderName then
        return "A folder named \"" & folderName & "\" already exists."
      end if
      
      -- Create the new folder
      make new folder with properties {name:folderName}
      
      return "Successfully created new Notes folder: " & folderName
      
    on error errMsg number errNum
      return "Error (" & errNum & "): Failed to create folder - " & errMsg
    end try
  end tell
end run
