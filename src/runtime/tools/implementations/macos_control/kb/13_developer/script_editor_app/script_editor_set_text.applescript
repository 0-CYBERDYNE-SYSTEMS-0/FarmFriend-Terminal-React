---
id: script_editor_set_text
title: Script Editor: Set Document Text
description: >-
  Sets the text content of a Script Editor document, allowing programmatic
  creation or modification of AppleScripts.
---
{scriptContent}

on setScriptEditorText(scriptContent)
  if scriptContent is missing value or scriptContent is "" then
    return "error: Script content not provided."
  end if
  
  tell application "Script Editor"
    try
      -- Check if Script Editor is running
      if not running then
        -- Launch Script Editor if not running
        run
        delay 0.5 -- Give it a moment to launch
      end if
      
      -- Determine if we need to create a new document or use an existing one
      set targetDoc to missing value
      
      if (count of documents) is 0 then
        -- No documents open, create a new one
        set targetDoc to make new document
      else
        -- Use the front document
        set targetDoc to front document
      end if
      
      -- Get document info before modification for reporting
      set docName to name of targetDoc
      set originalLength to count of (text of targetDoc)
      
      -- Set the text content of the document
      set text of targetDoc to scriptContent
      
      -- Document is now modified and needs to be compiled before running
      set isModified to modified of targetDoc
      set isCompiled to compiled of targetDoc
      
      -- Compile the document if it contains valid content
      set compileResult to "Not compiled"
      if scriptContent is not "" then
        try
          compile targetDoc
          set compileResult to "Successfully compiled"
        on error errMsg
          set compileResult to "Compilation failed: " & errMsg
        end try
      end if
      
      -- Save the document if it's new and has no name
      if docName starts with "untitled" and scriptContent is not "" then
        -- Optional: save document (commented out to avoid unexpected file writes)
        -- save targetDoc -- Would need file name and location to save properly
      end if
      
      -- Activate Script Editor to show the changes
      activate
      
      return "Set text of document '" & docName & "'" & return & ¬
        "Original length: " & originalLength & " characters" & return & ¬
        "New length: " & (count of scriptContent) & " characters" & return & ¬
        "Modified: " & isModified & return & ¬
        "Compilation status: " & compileResult
    on error errMsg
      return "Error setting script text: " & errMsg
    end try
  end tell
end setScriptEditorText

-- Example usage with placeholder script content
return my setScriptEditorText("{scriptContent}")
