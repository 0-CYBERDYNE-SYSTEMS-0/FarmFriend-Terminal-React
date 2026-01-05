---
id: things_complete_todo
title: Complete To-Dos in Things
description: Use AppleScript to mark to-dos as completed in Things app
---
-- Complete a to-do by ID
tell application "Things3"
    set theToDo to to do id "ABC123XYZ"
    set status of theToDo to completed
end tell

-- Complete a to-do by name (first match)
tell application "Things3"
    set theToDos to to dos where name is "Buy groceries"
    if (count of theToDos) > 0 then
        set status of item 1 of theToDos to completed
    end if
end tell

-- Complete all to-dos with a specific tag
tell application "Things3"
    set taggedToDos to to dos where tag names contains "Today"
    repeat with t in taggedToDos
        set status of t to completed
    end repeat
end tell
