---
id: core_reference_id
title: Core: ID Reference Form
description: Accessing objects by their unique ID (e.g., process ID, window ID).
---
set processOutput to "(System Events examples not run by default)"
set windowOutput to "(System Events examples not run by default)"

-- Example 1: Get a process by its ID (PID)
-- To make this runnable, find a PID of an existing process, e.g., Finder
(*
tell application "System Events"
  try
    -- Get PID of Finder for demonstration
    set finderPID to unix id of application process "Finder"
    if finderPID is not missing value then
      set finderProcessByID to application process id finderPID
      set processOutput to "Name of process with PID " & finderPID & ": " & (name of finderProcessByID)
    else
      set processOutput to "Could not get Finder PID."
    end if
  on error errMsg
    set processOutput to "Error finding process by ID: " & errMsg
  end try
end tell
*)

-- Example 2: Get a window by its ID
-- This is more complex as window IDs are less predictable and often require finding them first.
(*
tell application "System Events"
  tell application process "TextEdit" -- Make sure TextEdit is running with a window
    activate
    try
      if (count of windows) > 0 then
        set firstWindow to window 1
        set firstWindowID to id of firstWindow
        
        set windowByID to window id firstWindowID
        set windowOutput to "Title of window with ID " & firstWindowID & ": " & (name of windowByID)
      else
        set windowOutput to "TextEdit has no windows open."
      end if
    on error errMsg
      set windowOutput to "Error finding TextEdit window by ID: " & errMsg
    end try
  end tell
end tell
*)

return "Process by ID: " & processOutput & "\nWindow by ID: " & windowOutput
