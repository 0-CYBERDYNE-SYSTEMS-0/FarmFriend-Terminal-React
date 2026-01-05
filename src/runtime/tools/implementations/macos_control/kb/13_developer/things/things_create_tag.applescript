---
id: things_create_tag
title: Create and Manage Tags in Things
description: Use AppleScript to create and organize tags in Things app
---
-- Create a simple tag
tell application "Things3"
    set newTag to make new tag with properties {name:"Priority"}
end tell

-- Create a tag with a parent tag (hierarchical)
tell application "Things3"
    set parentTag to make new tag with properties {name:"Work"}
    set newTag to make new tag with properties {name:"Meetings", parent tag:parentTag}
end tell

-- Get all tags
tell application "Things3"
    set allTags to tags
    repeat with t in allTags
        log name of t
    end repeat
end tell
