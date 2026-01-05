---
id: terminal_manage_titles
title: Terminal: Manage Window and Tab Titles
description: Sets, gets, or resets custom titles for Terminal.app windows and tabs.
---
on runWithInput(inputData, legacyArguments)
    set defaultAction to "get"
    set defaultTitle to ""
    set defaultTarget to "window"
    
    -- Parse input parameters
    set action to defaultAction
    set newTitle to defaultTitle
    set target to defaultTarget
    
    if inputData is not missing value then
        if inputData contains {action:""} then
            set action to action of inputData
            {action}
        end if
        if inputData contains {title:""} then
            set newTitle to title of inputData
            {title}
        end if
        if inputData contains {target:""} then
            set target to target of inputData
            {target}
        end if
    end if
    
    -- Normalize action and target to lowercase
    set action to my toLower(action)
    set target to my toLower(target)
    
    -- Validate parameters
    if action is not in {"set", "get", "reset"} then
        return "Error: Invalid action. Use 'set', 'get', or 'reset'."
    end if
    
    if target is not in {"window", "tab"} then
        return "Error: Invalid target. Use 'window' or 'tab'."
    end if
    
    if action is "set" and newTitle is "" then
        return "Error: For 'set' action, a title must be provided."
    end if
    
    tell application "Terminal"
        if not (exists window 1) then
            return "Error: No Terminal windows are open."
        end if
        
        -- Get references to the frontmost window and its selected tab
        set frontWindow to window 1
        set currentTab to selected tab of frontWindow
        
        -- Perform the requested action
        if action is "set" then
            if target is "window" then
                -- Set custom title for the window
                set custom title of frontWindow to newTitle
                return "Window title set to: " & newTitle
            else
                -- Set custom title for the tab
                set custom title of currentTab to newTitle
                return "Tab title set to: " & newTitle
            end if
            
        else if action is "get" then
            if target is "window" then
                -- Get the window title (custom or default)
                set currentTitle to custom title of frontWindow
                if currentTitle is missing value then
                    set currentTitle to name of frontWindow
                    return "Current window title (default): " & currentTitle
                else
                    return "Current window title (custom): " & currentTitle
                end if
            else
                -- Get the tab title (custom or default)
                set currentTitle to custom title of currentTab
                if currentTitle is missing value then
                    set currentTitle to name of currentTab
                    return "Current tab title (default): " & currentTitle
                else
                    return "Current tab title (custom): " & currentTitle
                end if
            end if
            
        else if action is "reset" then
            if target is "window" then
                -- Reset window title to default
                set custom title of frontWindow to missing value
                return "Window title reset to default."
            else
                -- Reset tab title to default
                set custom title of currentTab to missing value
                return "Tab title reset to default."
            end if
        end if
    end tell
end runWithInput

-- Helper function to convert text to lowercase
on toLower(theText)
    set lowercaseText to ""
    repeat with i from 1 to length of theText
        set currentChar to character i of theText
        if ASCII number of currentChar ≥ 65 and ASCII number of currentChar ≤ 90 then
            -- Convert uppercase letter to lowercase
            set lowercaseText to lowercaseText & (ASCII character ((ASCII number of currentChar) + 32))
        else
            -- Keep the character as is
            set lowercaseText to lowercaseText & currentChar
        end if
    end repeat
    return lowercaseText
end toLower
