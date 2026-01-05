---
id: preview_open_file
title: Preview: Open File
description: Opens a specified file in the Preview application.
---
on run {filePath}
  try
    if filePath is "" or filePath is missing value then
      set filePath to "{filePath}"
    end if
    
    -- Convert to POSIX file if it's not already
    if filePath does not start with "/" then
      return "Error: Please provide a valid absolute POSIX path starting with /"
    end if
    
    set fileToOpen to POSIX file filePath
    
    tell application "Preview"
      activate
      open fileToOpen
      return "File opened successfully in Preview: " & filePath
    end tell
    
  on error errMsg number errNum
    if errNum is -43 then
      return "Error: File not found at path: " & filePath
    else
      return "Error (" & errNum & "): Failed to open file - " & errMsg
    end if
  end try
end run
