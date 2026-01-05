---
id: terminal_split_pane
title: Terminal: Split Pane Management
description: >-
  Creates and manages split panes in Terminal.app through UI automation of menu
  commands.
---
on runWithInput(inputData, legacyArguments)
    set defaultAction to "create"
    set defaultDirection to "horizontal"
    set defaultTarget to "next"
    
    -- Parse input parameters
    set action to defaultAction
    set direction to defaultDirection
    set target to defaultTarget
    
    if inputData is not missing value then
        if inputData contains {action:""} then
            set action to action of inputData
        end if
        if inputData contains {direction:""} then
            set direction to direction of inputData
        end if
        if inputData contains {target:""} then
            set target to target of inputData
        end if
    end if
    
    -- MCP placeholders for input
    set action to "{action}" -- create, close, or navigate
    set direction to "{direction}" -- horizontal or vertical (for create action)
    set target to "{target}" -- next, previous, up, down, left, or right (for navigate action)
    
    -- Normalize inputs to lowercase
    set action to my toLower(action)
    set direction to my toLower(direction)
    set target to my toLower(target)
    
    -- Validate inputs
    if action is not in {"create", "close", "navigate"} then
        return "Error: Invalid action. Use 'create', 'close', or 'navigate'."
    end if
    
    if action is "create" and direction is not in {"horizontal", "vertical"} then
        return "Error: For 'create' action, direction must be 'horizontal' or 'vertical'."
    end if
    
    if action is "navigate" and target is not in {"next", "previous", "up", "down", "left", "right"} then
        return "Error: For 'navigate' action, target must be 'next', 'previous', 'up', 'down', 'left', or 'right'."
    end if
    
    -- Ensure Terminal.app is active
    tell application "Terminal" to activate
    delay 0.5 -- Give Terminal time to become active
    
    -- Perform the requested action via UI automation
    if action is "create" then
        return createSplitPane(direction)
    else if action is "close" then
        return closeSplitPane()
    else if action is "navigate" then
        return navigateSplitPane(target)
    end if
end runWithInput

-- Helper function to create a split pane
on createSplitPane(direction)
    tell application "System Events"
        tell process "Terminal"
            set frontmost to true
            
            -- Use Window menu to create split pane
            tell menu bar 1
                tell menu bar item "Window"
                    tell menu "Window"
                        if direction is "horizontal" then
                            -- Select "Split Pane Horizontally"
                            -- This creates a side-by-side split (left and right panes)
                            click menu item "Split Pane Horizontally"
                            return "Created horizontal split pane (side by side)."
                        else
                            -- Select "Split Pane Vertically"
                            -- This creates a top-bottom split
                            click menu item "Split Pane Vertically"
                            return "Created vertical split pane (top and bottom)."
                        end if
                    end tell
                end tell
            end tell
        end tell
    end tell
end createSplitPane

-- Helper function to close the current split pane
on closeSplitPane()
    tell application "System Events"
        tell process "Terminal"
            set frontmost to true
            
            -- Use Window menu to close split pane
            tell menu bar 1
                tell menu bar item "Window"
                    tell menu "Window"
                        click menu item "Close Split Pane"
                        return "Closed current split pane."
                    end tell
                end tell
            end tell
        end tell
    end tell
end closeSplitPane

-- Helper function to navigate between split panes
on navigateSplitPane(target)
    tell application "System Events"
        tell process "Terminal"
            set frontmost to true
            
            -- Use Window menu to navigate between panes
            tell menu bar 1
                tell menu bar item "Window"
                    tell menu "Window"
                        if target is "next" then
                            click menu item "Select Next Pane"
                            return "Navigated to next pane."
                        else if target is "previous" then
                            click menu item "Select Previous Pane"
                            return "Navigated to previous pane."
                        else
                            -- Directional navigation
                            set menuItemName to "Move Focus to " & my capitalize(target)
                            try
                                click menu item menuItemName
                                return "Moved focus " & target & "."
                            on error
                                return "Error: Could not move focus " & target & ". Ensure there is a pane in that direction."
                            end try
                        end if
                    end tell
                end tell
            end tell
        end tell
    end tell
end navigateSplitPane

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

-- Helper function to capitalize first letter
on capitalize(theText)
    if length of theText is 0 then
        return ""
    end if
    
    set firstChar to character 1 of theText
    set restOfText to text 2 thru -1 of theText
    
    if ASCII number of firstChar ≥ 97 and ASCII number of firstChar ≤ 122 then
        -- Convert lowercase letter to uppercase
        set capitalizedChar to ASCII character ((ASCII number of firstChar) - 32)
    else
        set capitalizedChar to firstChar
    end if
    
    return capitalizedChar & restOfText
end capitalize
