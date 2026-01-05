---
id: things_create_todo
title: Create To-Do in Things
description: Use AppleScript to create a new to-do in Things app
---
-- Create a simple to-do
tell application "Things3"
    set newToDo to make new to do with properties {name:"Buy groceries"}
end tell

-- Create a to-do with more properties
tell application "Things3"
    set newToDo to make new to do with properties {name:"Finish report", notes:"Include all quarterly data", due date:date "2024-05-20", tags:{"Work", "Important"}}
end tell
