---
id: ghostty_manage_titles
title: Manage Ghostty Window Titles
description: New title text (for 'set' action only)
---
on run {input, parameters}
    set action to "{action}"
    set title to "{title}"
    
    -- Validate and set defaults for parameters
    if action is "" or action is missing value then
        return "Error: Please specify an action (set, get, or reset)"
    end if
    
    -- Convert action to lowercase for case-insensitive comparison
    set action to my toLowerCase(action)
    
    -- Validate the action
    if action is not in {"set", "get", "reset"} then
        return "Error: Invalid action. Use 'set', 'get', or 'reset'."
    end if
    
    -- Check if title is provided for 'set' action
    if action is "set" and (title is "" or title is missing value) then
        return "Error: Title must be provided when using the 'set' action."
    end if
    
    -- Check if Ghostty is installed and running
    try
        tell application "System Events"
            set ghosttyRunning to exists process "Ghostty"
        end tell
        
        if not ghosttyRunning then
            tell application "Ghostty" to activate
            delay 1 -- Give Ghostty time to start up
        end if
    on error
        return "Error: Ghostty terminal application is not installed or cannot be started."
    end try
    
    -- Perform the requested action
    if action is "get" then
        -- Get the current window title
        tell application "System Events"
            tell process "Ghostty"
                set currentTitle to name of front window
                return "Current Ghostty window title: " & currentTitle
            end tell
        end tell
        
    else if action is "set" then
        -- Set custom title using terminal escape sequence via keyboard input
        -- The escape sequence to set window title is: "\033]2;NEW_TITLE\007"
        set escapedTitle to (ASCII character 27) & "]2;" & title & (ASCII character 7)
        
        tell application "System Events"
            tell process "Ghostty"
                set frontmost to true
                delay 0.3 -- Give window time to activate
                
                -- Send the escape sequence to set the title
                -- This technique works via UI automation
                keystroke "t" using {command down} -- Open a new tab
                delay 0.3
                
                -- Execute echo command to set title
                keystroke "echo -ne \"\\033]2;" & title & "\\007\""
                keystroke return
                
                -- Close the temporary tab
                keystroke "w" using {command down}
                
                return "Window title set to: " & title
            end tell
        end tell
        
    else if action is "reset" then
        -- Reset title using terminal escape sequence
        -- Send an empty title which will reset to default behavior
        
        tell application "System Events"
            tell process "Ghostty"
                set frontmost to true
                delay 0.3 -- Give window time to activate
                
                -- Same technique as setting but with empty title
                keystroke "t" using {command down} -- Open a new tab
                delay 0.3
                
                -- Execute echo command to reset title
                keystroke "echo -ne \"\\033]2;\\007\""
                keystroke return
                
                -- Close the temporary tab
                keystroke "w" using {command down}
                
                return "Window title reset to default."
            end tell
        end tell
    end if
end run

-- Helper function to convert text to lowercase
on toLowerCase(theText)
    return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLowerCase
