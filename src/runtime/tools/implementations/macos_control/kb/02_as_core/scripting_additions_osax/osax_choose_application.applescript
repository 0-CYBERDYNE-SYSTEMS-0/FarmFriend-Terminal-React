---
id: osax_choose_application
title: StandardAdditions: choose application Command
description: >-
  Displays a dialog allowing the user to select an application. Returns an alias
  to the chosen application.
---
try
  set chosenAppAlias to choose application with title "Choose an Editor" with prompt "Please select your preferred text editor:"
  
  -- Get information about the chosen application
  tell application "Finder"
    set appName to name of chosenAppAlias
  end tell
  set appPath to POSIX path of chosenAppAlias
  
  set resultMessage to "You chose: " & appName & "\nPath: " & appPath
  
  -- Example: Try to get version (might fail if app not scriptable for version or not running)
  -- This is a more advanced step and often requires a separate tell block to the chosen app.
  (*
  try
    -- This is a simplified way, direct `version of chosenAppAlias` might not work.
    -- Typically, you would `tell application (chosenAppAlias as text)` or similar.
    set appIdentifier to id of application (path to chosenAppAlias) -- Get bundle ID
    tell application id appIdentifier
      set appVersion to version
      set resultMessage to resultMessage & "\nVersion: " & appVersion
    end tell
  on error verErr
    set resultMessage to resultMessage & "\nVersion: (Could not get version - " & verErr & ")"
  end try
  *)
  
on error errMsg number errNum
  if errNum is -128 then
    set resultMessage to "User cancelled application selection."
  else
    set resultMessage to "Error (" & errNum & "): " & errMsg
  end if
end try

return resultMessage
