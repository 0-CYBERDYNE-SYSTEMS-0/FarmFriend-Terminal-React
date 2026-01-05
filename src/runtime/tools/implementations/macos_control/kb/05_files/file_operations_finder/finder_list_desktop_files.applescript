---
id: finder_list_desktop_files
title: Finder: List Names of Files on Desktop
description: >-
  Retrieves a list of names of all files (not folders) directly on the current
  user's Desktop.
---
tell application "Finder"
  try
    set desktopFiles to name of every file of desktop
    if desktopFiles is {} then
      return "No files found on the Desktop."
    else
      -- AppleScript lists are returned as {item1, item2}. For text output, join them.
      set AppleScript's text item delimiters to "\\n"
      set fileListString to desktopFiles as string
      set AppleScript's text item delimiters to "" -- Reset
      return "Files on Desktop:\\n" & fileListString
    end if
  on error errMsg
    return "error: Could not list Desktop files - " & errMsg
  end try
end tell
