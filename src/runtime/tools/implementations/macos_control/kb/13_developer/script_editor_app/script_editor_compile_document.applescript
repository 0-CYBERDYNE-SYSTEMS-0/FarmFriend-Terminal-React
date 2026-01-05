---
id: script_editor_compile_document
title: Script Editor: Compile Document
description: >-
  Compiles an AppleScript document in Script Editor to check for syntax errors
  and prepare it for execution.
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
    
    -- Get initial state of the document
    set wasCompiled to compiled of scriptDoc
    
    -- Compile the document
    compile scriptDoc
    
    -- Check if compilation was successful
    set isCompiled to compiled of scriptDoc
    
    -- Get compilation result information
    if isCompiled then
      -- Compilation succeeded
      if wasCompiled then
        set resultMessage to "Document '" & docName & "' was already compiled. No errors found."
      else
        set resultMessage to "Document '" & docName & "' was successfully compiled. No errors found."
      end if
      
      -- Get additional information about the compiled script
      set scriptResult to "Document: " & docName & return
      set scriptResult to scriptResult & "Status: Successfully Compiled" & return
      set scriptResult to scriptResult & "Length: " & (count of text of scriptDoc) & " characters" & return
      
      -- Get language version if available
      try
        set langVersion to AppleScript's version
        set scriptResult to scriptResult & "AppleScript Version: " & langVersion & return
      end try
      
      return scriptResult
    else
      -- Compilation failed - get error information
      set errMessage to "Compilation failed for document '" & docName & "'."
      
      -- Get error information
      try
        set errLine to line number of the first error
        set errText to text of the first error
        set errStart to offset of the first error
        set errEnd to (offset of the first error) + (length of the first error) - 1
        
        set errMessage to errMessage & return & return
        set errMessage to errMessage & "Line: " & errLine & return
        set errMessage to errMessage & "Error: " & errText & return
        set errMessage to errMessage & "Character positions: " & errStart & " to " & errEnd
      end try
      
      return errMessage
    end if
  on error errMsg
    return "Error during compilation process: " & errMsg
  end try
end tell
