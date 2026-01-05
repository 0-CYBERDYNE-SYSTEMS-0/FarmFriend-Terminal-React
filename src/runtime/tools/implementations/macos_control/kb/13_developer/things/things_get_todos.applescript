---
id: things_get_todos
title: Get To-Dos from Things
description: Use AppleScript to retrieve to-dos from Things app with filtering options
---
-- Get all to-dos
tell application "Things3"
    set allToDos to to dos
    log (count of allToDos) & " to-dos found"
end tell

-- Get to-dos from a specific list
tell application "Things3"
    set todayToDos to to dos of list "Today"
    log (count of todayToDos) & " to-dos for today"
end tell

-- Get to-dos with a specific tag
tell application "Things3"
    set workToDos to to dos where tag names contains "Work"
    log (count of workToDos) & " work-related to-dos"
end tell
