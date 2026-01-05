---
id: things_create_area
title: Create Area in Things
description: Use AppleScript to create a new area in Things app
---
-- Create a simple area
tell application "Things3"
    set newArea to make new area with properties {name:"Personal"}
end tell

-- Create an area with additional properties
tell application "Things3"
    set newArea to make new area with properties {name:"Work", tags:{"Job", "Priority"}}
end tell
