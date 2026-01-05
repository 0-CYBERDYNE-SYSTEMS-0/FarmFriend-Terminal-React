---
id: iterm_split_pane
title: iTerm2 Split Pane Management
description: Amount to resize by (1-10, where 10 is maximum) when using resize action
---
on run {input, parameters}
    set action to "{action}"
    set direction to "{direction}"
    set resizeAmount to "{resizeAmount}"
    
    -- Validate and set defaults for parameters
    if action is "" or action is missing value then
        return "Error: Please specify an action (create, close, navigate, resize, or maximize)"
    end if
    
    -- Convert parameters to lowercase for case-insensitive comparison
    set action to my toLowerCase(action)
    
    -- Set defaults and validate direction if needed
    if direction is not "" and direction is not missing value then
        set direction to my toLowerCase(direction)
    else
        if action is "create" then
            set direction to "horizontal"
        else if action is "navigate" then
            set direction to "right"
        else if action is "resize" then
            set direction to "right"
        end if
    end if
    
    -- Set default resize amount if not provided
    if resizeAmount is "" or resizeAmount is missing value then
        if action is "resize" then
            set resizeAmount to 5
        end if
    else
        try
            set resizeAmount to resizeAmount as number
            if resizeAmount < 1 then set resizeAmount to 1
            if resizeAmount > 10 then set resizeAmount to 10
        on error
            set resizeAmount to 5
        end try
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
        activate
        
        if action is "create" then
            return createSplitPane(direction)
        else if action is "close" then
            return closeSplitPane()
        else if action is "navigate" then
            return navigatePanes(direction)
        else if action is "resize" then
            return resizePane(direction, resizeAmount)
        else if action is "maximize" then
            return maximizePane()
        else
            return "Error: Invalid action. Use 'create', 'close', 'navigate', 'resize', or 'maximize'."
        end if
    end tell
end run

-- Create a new split pane
on createSplitPane(direction)
    tell application "iTerm2"
        tell current window
            tell current session
                if direction is "vertical" then
                    -- Split vertically (top/bottom)
                    set newSession to split vertically with default profile
                    return "Created vertical split pane (top/bottom)"
                else
                    -- Split horizontally (left/right)
                    set newSession to split horizontally with default profile
                    return "Created horizontal split pane (left/right)"
                end if
            end tell
        end tell
    end tell
end createSplitPane

-- Close the current pane
on closeSplitPane()
    tell application "iTerm2"
        tell current window
            if (count of sessions) > 1 then
                tell current session
                    close
                    return "Closed current pane"
                end tell
            else
                return "Cannot close the last pane in the window"
            end if
        end tell
    end tell
end closeSplitPane

-- Navigate between panes
on navigatePanes(direction)
    tell application "iTerm2"
        tell current window
            -- Determine the keyboard shortcut based on direction
            if direction is "right" then
                tell application "System Events" to key code 124 using {option down, command down}
                return "Navigated to the right pane"
                
            else if direction is "left" then
                tell application "System Events" to key code 123 using {option down, command down}
                return "Navigated to the left pane"
                
            else if direction is "up" then
                tell application "System Events" to key code 126 using {option down, command down}
                return "Navigated to the upper pane"
                
            else if direction is "down" then
                tell application "System Events" to key code 125 using {option down, command down}
                return "Navigated to the lower pane"
                
            else if direction is "next" then
                tell application "System Events" to key code 48 using {shift down, command down}
                return "Navigated to the next pane"
                
            else if direction is "previous" then
                tell application "System Events" to key code 48 using {shift down, command down, option down}
                return "Navigated to the previous pane"
                
            else
                return "Error: Invalid navigation direction. Use 'right', 'left', 'up', 'down', 'next', or 'previous'."
            end if
        end tell
    end tell
end navigatePanes

-- Resize the current pane
on resizePane(direction, amount)
    -- Scale the amount to a reasonable number of keystrokes (1-3)
    set keyCount to round (amount / 3.5)
    if keyCount < 1 then set keyCount to 1
    if keyCount > 3 then set keyCount to 3
    
    tell application "iTerm2"
        activate
        
        if direction is "right" then
            repeat keyCount times
                tell application "System Events" to key code 124 using {control down, command down}
                delay 0.1
            end repeat
            return "Resized pane to the right"
            
        else if direction is "left" then
            repeat keyCount times
                tell application "System Events" to key code 123 using {control down, command down}
                delay 0.1
            end repeat
            return "Resized pane to the left"
            
        else if direction is "up" then
            repeat keyCount times
                tell application "System Events" to key code 126 using {control down, command down}
                delay 0.1
            end repeat
            return "Resized pane upward"
            
        else if direction is "down" then
            repeat keyCount times
                tell application "System Events" to key code 125 using {control down, command down}
                delay 0.1
            end repeat
            return "Resized pane downward"
            
        else
            return "Error: Invalid resize direction. Use 'right', 'left', 'up', or 'down'."
        end if
    end tell
end resizePane

-- Maximize (zoom) the current pane
on maximizePane()
    tell application "iTerm2"
        activate
        tell application "System Events" to key code 13 using {shift down, command down}
        return "Toggled maximize (zoom) for current pane"
    end tell
end maximizePane

-- Helper function to convert text to lowercase
on toLowerCase(theText)
    return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLowerCase
