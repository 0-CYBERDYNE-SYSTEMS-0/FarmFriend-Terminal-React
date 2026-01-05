---
id: script_editor_run_document
title: Script Editor: Run Document
description: Executes an AppleScript document in Script Editor and retrieves its result.
---
tell application "Script Editor"
  try
    -- Check if Script Editor is running and has documents open
    if not running then
      return "Error: Script Editor is not running."
    end if
    if (count of documents) is 0 then
      return "Error: No documents are open in Script Editor."
    end if
    
    -- Reference to the frontmost document
    set scriptDoc to front document
    set docName to name of scriptDoc
    
    -- Check if the document needs to be compiled first
    if not compiled of scriptDoc then
      -- Compile the document
      compile scriptDoc
      
      -- Check if compilation was successful
      if not compiled of scriptDoc then
        return "Error: Failed to compile the document '" & docName & "'."
      end if
    end if
    
    -- Run the script and capture the result
    set scriptResult to run scriptDoc
    
    -- Format the result for display
    set resultType to class of scriptResult as text
    
    -- Build a detailed result message
    set resultMessage to "Script '" & docName & "' executed successfully." & return & return
    set resultMessage to resultMessage & "Result type: " & resultType & return
    
    -- Format the result value based on its type
    if resultType is "text" or resultType is "string" or resultType is "Unicode text" then
      -- For text results, show the actual text
      set resultMessage to resultMessage & "Result value: " & scriptResult
    else if resultType is "list" then
      -- For list results, show count and items
      set resultMessage to resultMessage & "Result value: List with " & (count of scriptResult) & " items." & return
      set itemNumber to 0
      repeat with itemValue in scriptResult
        set itemNumber to itemNumber + 1
        set resultMessage to resultMessage & "  " & itemNumber & ": " & itemValue & return
      end repeat
    else if resultType is "integer" or resultType is "real" then
      -- For numeric results, show the number
      set resultMessage to resultMessage & "Result value: " & scriptResult
    else
      -- For other types, show a generic representation
      set resultMessage to resultMessage & "Result value: <" & resultType & " value>"
    end if
    
    return resultMessage
  on error errMsg
    return "Error running script in Script Editor: " & errMsg
  end try
end tell
