---
id: iterm_dev_environment
title: Set up iTerm2 development environment
description: Command to start the client (optional)
---
on run {input, parameters}
    set projectPath to "{projectPath}"
    set serverCommand to "{serverCommand}"
    set clientCommand to "{clientCommand}"
    
    if projectPath is "" or projectPath is missing value then
        tell application "Finder"
            if exists Finder window 1 then
                set currentFolder to target of Finder window 1 as alias
                set projectPath to POSIX path of currentFolder
            else
                display dialog "No Finder window open and no project path provided." buttons {"OK"} default button "OK" with icon stop
                return
            end if
        end tell
    end if
    
    -- Set default commands if not provided
    if serverCommand is "" or serverCommand is missing value then
        set serverCommand to ""
    end if
    
    if clientCommand is "" or clientCommand is missing value then
        set clientCommand to ""
    end if
    
    tell application "iTerm"
        -- Create a new window or use existing
        if exists window 1 then
            set projectWindow to window 1
        else
            set projectWindow to (create window with default profile)
        end if
        
        tell projectWindow
            -- Set up server pane (top)
            tell current session
                set name to "Server"
                write text "cd " & quoted form of projectPath
                if serverCommand is not "" then
                    write text serverCommand
                end if
                
                -- Split horizontally for client pane (middle)
                set clientPane to (split horizontally with default profile)
                tell clientPane
                    set name to "Client"
                    write text "cd " & quoted form of projectPath
                    if clientCommand is not "" then
                        write text clientCommand
                    end if
                end tell
                
                -- Split client pane horizontally for free terminal (bottom)
                tell clientPane
                    set freePane to (split horizontally with default profile)
                    tell freePane
                        set name to "Terminal"
                        write text "cd " & quoted form of projectPath
                    end tell
                end tell
            end tell
            
            -- Create a second tab for utility functions
            set utilityTab to (create tab with default profile)
            tell utilityTab
                tell current session
                    set name to "Utility"
                    write text "cd " & quoted form of projectPath
                end tell
            end tell
        end tell
        
        -- Activate iTerm and bring to front
        activate
    end tell
    
    return "Created development environment for project at " & projectPath
end run
