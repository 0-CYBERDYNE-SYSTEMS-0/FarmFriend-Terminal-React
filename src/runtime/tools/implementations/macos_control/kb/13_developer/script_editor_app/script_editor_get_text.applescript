---
id: script_editor_get_text
title: Script Editor: Get Document Text
description: Retrieves the text content of a Script Editor document.
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
    
    -- Get the frontmost document and its text
    set frontDoc to front document
    set docName to name of frontDoc
    set scriptText to text of frontDoc
    
    -- Optional: Get other properties of the document
    set docPath to "Not saved"
    try
      set docPath to path of frontDoc
    end try
    
    set isModified to modified of frontDoc
    set modStatus to if isModified then "Yes" else "No"
    
    -- Return document information including content
    return "Document: " & docName & return & ¬
           "Path: " & docPath & return & ¬
           "Modified: " & modStatus & return & ¬
           "Length: " & (count of scriptText) & " characters" & return & ¬
           "----------------------------------------" & return & ¬
           scriptText
  on error errMsg
    return "Error getting text from Script Editor document: " & errMsg
  end try
end tell
