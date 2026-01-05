---
id: things_create_project
title: Create Project in Things
description: Use AppleScript to create a new project in Things app
---
-- Create a simple project
tell application "Things3"
    set newProject to make new project with properties {name:"Redesign Website"}
end tell

-- Create a project with more properties
tell application "Things3"
    set newProject to make new project with properties {name:"Q2 Planning", notes:"Strategic planning for Q2", area:"Work", due date:date "2024-06-30", tags:{"Planning", "Q2"}}
end tell
