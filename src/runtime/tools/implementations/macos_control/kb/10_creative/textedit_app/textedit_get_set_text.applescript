---
id: textedit_get_set_text
title: TextEdit: Get and Set Text of Front Document
description: >-
  Retrieves the entire text content of the frontmost TextEdit document, or sets
  it.
---
tell application "TextEdit"
  if not running then return "error: TextEdit is not running."
  if (count of documents) is 0 then return "error: No documents open in TextEdit."
  activate
  try
    return text of front document
  on error errMsg
    return "error: Could not get text - " & errMsg
  end try
end tell
