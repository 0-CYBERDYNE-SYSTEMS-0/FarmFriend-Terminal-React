---
id: finder_get_selected_items_paths
title: Finder: Get POSIX Path of Selected Items
description: >-
  Retrieves the POSIX paths of all currently selected files and folders in the
  frontmost Finder window.
---
tell application "Finder"
  if not running then return "error: Finder is not running."
  activate -- Ensure Finder is frontmost to get its selection
  delay 0.2
  try
    set selectedItems to selection
    if selectedItems is {} then
      return "No items selected in Finder."
    end if
    
    set itemPathsList to {}
    repeat with anItem in selectedItems
      set end of itemPathsList to POSIX path of (anItem as alias)
    end repeat
    
    set AppleScript's text item delimiters to "\\n"
    set pathsString to itemPathsList as string
    set AppleScript's text item delimiters to "" -- Reset
    return pathsString
    
  on error errMsg
    return "error: Failed to get selected Finder items - " & errMsg
  end try
end tell
