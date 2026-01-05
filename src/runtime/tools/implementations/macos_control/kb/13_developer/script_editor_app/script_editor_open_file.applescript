---
id: script_editor_open_file
title: Script Editor: Open Script File
description: Opens an AppleScript file in Script Editor.
---
{filePath}

on openScriptFile(scriptPath)
  if scriptPath is missing value or scriptPath is "" then
    return "error: Script file path not provided."
  end if
  
  try
    -- Determine path type and convert as needed
    set scriptFileRef to missing value
    
    if scriptPath starts with "/" then
      -- Path is in POSIX format
      set scriptFileRef to POSIX file scriptPath
    else
      -- Assume HFS path or try to use as is
      try
        set scriptFileRef to scriptPath as alias
      on error
        -- If not a valid alias, try as a string path
        set scriptFileRef to scriptPath
      end try
    end if
    
    -- Open the file in Script Editor
    tell application "Script Editor"
      activate
      set scriptDoc to open scriptFileRef
      
      -- Return information about the opened document
      set docName to name of scriptDoc
      set docPath to "Not saved to disk"
      try
        set docPath to path of scriptDoc
      end try
      
      return "Successfully opened script: " & docName & return & "Path: " & docPath
    end tell
  on error errMsg
    return "Error opening script file: " & errMsg
  end try
end openScriptFile

return my openScriptFile("{filePath}")
