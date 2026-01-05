---
id: meta_open_dictionary
title: Meta: Exploring Application Scriptability (Open Dictionary)
description: >-
  Explains how to use Script Editor's 'Open Dictionary...' feature to discover
  an application's scriptable commands, objects, and properties.
---
(*
  This is not a runnable script, but a conceptual guide.
  You would use the information found in a dictionary like this:
*)

-- After looking at Safari's dictionary, you might find:
-- Class: document
--   Properties:
--     URL (text) : The URL of the document.
--     name (text) : The title of the document.

-- So, you could write:
(*
tell application "Safari"
  if (count of documents) > 0 then
    set docName to name of front document
    set docURL to URL of front document
    display dialog "Page: " & docName & "\\nURL: " & docURL
  end if
end tell
*)
