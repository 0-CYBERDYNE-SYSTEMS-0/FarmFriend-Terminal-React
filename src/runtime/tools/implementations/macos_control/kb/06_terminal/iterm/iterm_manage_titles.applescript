---
id: iterm_manage_titles
title: Manage iTerm2 Window and Tab Titles
description: Where to apply the title - window, tab, or session
---
on run {input, parameters}
    set action to "{action}"
    set title to "{title}"
    set target to "{target}"
    
    -- Validate and set defaults for parameters
    if action is "" or action is missing value then
        return "Error: Please specify an action (set, get, or reset)"
    end if
    
    -- Convert action to lowercase for case-insensitive comparison
    set action to my toLowerCase(action)
    
    -- Set a default target if not provided
    if target is "" or target is missing value then
        set target to "tab"
    end if
    
    -- Convert target to lowercase for case-insensitive comparison
    set target to my toLowerCase(target)
    
    -- Validate the target
    if target is not in {"window", "tab", "session"} then
        return "Error: Invalid target. Use 'window', 'tab', or 'session'."
    end if
    
    -- Check if title is provided for 'set' action
    if action is "set" and (title is "" or title is missing value) then
        return "Error: Title must be provided when using the 'set' action."
    end if
    
    -- Check if iTerm2 is running
    tell application "System Events"
        if not (exists process "iTerm2") then
            tell application "iTerm2" to activate
            delay 1 -- Give iTerm2 time to launch
        end if
    end tell
    
    -- Perform the requested action
    tell application "iTerm2"
        if (count of windows) is 0 then
            create window with default profile
            delay 0.5
        end if
        
        set currentWindow to current window
        
        if action is "set" then
            -- Set custom title based on target
            if target is "window" then
                set name of currentWindow to title
                return "Window title set to: " & title
                
            else if target is "tab" then
                tell current session of currentWindow
                    set name to title
                end tell
                return "Tab title set to: " & title
                
            else if target is "session" then
                tell current session of current tab of currentWindow
                    set name to title
                end tell
                return "Session title set to: " & title
            end if
            
        else if action is "get" then
            -- Get current title based on target
            if target is "window" then
                set currentTitle to name of currentWindow
                return "Current window title: " & currentTitle
                
            else if target is "tab" then
                tell current tab of currentWindow
                    set currentTitle to name
                end tell
                return "Current tab title: " & currentTitle
                
            else if target is "session" then
                tell current session of current tab of currentWindow
                    set currentTitle to name
                end tell
                return "Current session title: " & currentTitle
            end if
            
        else if action is "reset" then
            -- Reset title based on target (send special escape sequences)
            if target is "window" then
                -- Reset window title using escape sequence
                tell current session of currentWindow
                    write text (ASCII character 27) & "]2;" & (ASCII character 7) without newline
                end tell
                return "Window title reset to default."
                
            else if target is "tab" then
                -- Reset tab title using escape sequence
                tell current session of currentWindow
                    write text (ASCII character 27) & "]1;" & (ASCII character 7) without newline
                end tell
                return "Tab title reset to default."
                
            else if target is "session" then
                -- Reset session title (which will revert to showing current command/path)
                tell current session of current tab of currentWindow
                    -- Just set to empty which causes iTerm2 to revert to dynamic title
                    set name to ""
                end tell
                return "Session title reset to default."
            end if
            
        else
            return "Error: Invalid action. Use 'set', 'get', or 'reset'."
        end if
    end tell
end run

-- Helper function to convert text to lowercase
on toLowerCase(theText)
    return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLowerCase
