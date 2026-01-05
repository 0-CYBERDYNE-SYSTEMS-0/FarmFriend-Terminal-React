---
id: shortcuts_run_by_name
title: Shortcuts: Run Shortcut by Name
description: >-
  Executes a specified macOS Shortcut by its name. Optionally provide input to
  the Shortcut.
---
{shortcutName}
{shortcutInput}

on runNamedShortcut(sName, sInput)
  if sName is missing value or sName is "" then return "error: Shortcut name is required."
  
  try
    tell application "Shortcuts Events"
      if sInput is not missing value and sInput is not "" then
        set shortcutResult to run shortcut sName with input sInput
      else
        set shortcutResult to run shortcut sName
      end if
    end tell
    
    if shortcutResult is missing value then
      return "Shortcut '" & sName & "' executed. No explicit output from shortcut."
    else
      -- Coerce result to string for consistent return type
      return "Shortcut '" & sName & "' executed. Output: " & (shortcutResult as text)
    end if
    
  on error errMsg number errNum
    return "error (" & errNum & "): Failed to run Shortcut '" & sName & "': " & errMsg
  end try
end runNamedShortcut

return my runNamedShortcut("{shortcutName}", "{shortcutInput}")
