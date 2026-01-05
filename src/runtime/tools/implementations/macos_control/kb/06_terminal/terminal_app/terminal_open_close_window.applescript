---
id: terminal_open_close_window
title: Terminal: Open and Close Windows
description: >-
  Opens a new Terminal.app window, optionally runs a command, and provides
  functionality to close windows.
---
on runWithInput(inputData, legacyArguments)
    set defaultCommand to ""
    set defaultAction to "open"
    set defaultTargetWindow to "front"
    
    -- Parse input parameters
    set command to defaultCommand
    set action to defaultAction
    set targetWindow to defaultTargetWindow
    
    if inputData is not missing value then
        if inputData contains {command:""} then
            set command to command of inputData
        end if
        if inputData contains {action:""} then
            set action to action of inputData
        end if
        if inputData contains {targetWindow:""} then
            set targetWindow to targetWindow of inputData
        end if
    end if
    
    -- MCP placeholders for input
    set command to "{command}" -- optional command to run
    set action to "{action}" -- open or close (defaults to "open" if omitted)
    set targetWindow to "{targetWindow}" -- all, front, or a number
    
    -- Handle different actions
    if action is "open" then
        return openTerminalWindow(command)
    else if action is "close" then
        return closeTerminalWindow(targetWindow)
    else
        return "Error: Invalid action. Use 'open' or 'close'."
    end if
end runWithInput

on openTerminalWindow(command)
    tell application "Terminal"
        -- Activate Terminal application
        activate
        
        -- Create a new window
        set newWindow to do script ""
        
        -- Run the command if provided
        if command is not "" then
            do script command in newWindow
        end if
        
        return "New Terminal window opened" & (if command is not "" then " and executed: " & command else "")
    end tell
end openTerminalWindow

on closeTerminalWindow(targetWindow)
    tell application "Terminal"
        -- Handle closing terminal windows based on targetWindow parameter
        if targetWindow is "all" then
            -- Close all windows
            close every window
            return "Closed all Terminal windows"
            
        else if targetWindow is "front" or targetWindow is "" then
            -- Close the frontmost window
            if (count of windows) > 0 then
                close front window
                return "Closed frontmost Terminal window"
            else
                return "No Terminal windows to close"
            end if
            
        else
            -- Try to close a specific window by number
            try
                set windowNumber to targetWindow as integer
                if windowNumber > 0 and windowNumber ≤ (count of windows) then
                    close window windowNumber
                    return "Closed Terminal window #" & windowNumber
                else
                    return "Error: Window number out of range. Valid range: 1-" & (count of windows)
                end if
            on error
                return "Error: Invalid window target. Use 'all', 'front', or a window number."
            end try
        end if
    end tell
end closeTerminalWindow
