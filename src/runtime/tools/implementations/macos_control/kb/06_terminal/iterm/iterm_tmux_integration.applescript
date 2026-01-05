---
id: iterm_tmux_integration
title: iTerm2 tmux Integration
description: Whether to create a new session if it doesn't exist (true/false)
---
on run {input, parameters}
    set host to "{host}"
    set sessionName to "{sessionName}"
    set createNew to "{createNew}"
    
    if sessionName is "" or sessionName is missing value then
        display dialog "Please provide a tmux session name." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Set defaults if not provided
    if createNew is "" or createNew is missing value then
        set createNew to "true"
    end if
    
    -- Check if this is a local or remote session
    set isRemote to (host is not "" and host is not missing value)
    
    -- Build the tmux command
    set tmuxCommand to "tmux -CC "
    
    if createNew is "true" then
        -- Command to attach if exists or create new
        set tmuxCommand to tmuxCommand & "new-session -A -s " & quoted form of sessionName
    else
        -- Command to attach only, will fail if session doesn't exist
        set tmuxCommand to tmuxCommand & "attach-session -t " & quoted form of sessionName
    end if
    
    tell application "iTerm"
        -- Create a new window and run the appropriate command
        create window with default profile
        
        tell current window
            tell current session
                if isRemote then
                    -- For remote sessions, first SSH to the host
                    set sshCommand to "ssh " & host & " -t " & quoted form of tmuxCommand
                    write text sshCommand
                else
                    -- For local sessions, run tmux directly
                    write text tmuxCommand
                end if
            end tell
        end tell
    end tell
    
    return "Connected to " & (if isRemote then "remote" else "local") & " tmux session: " & sessionName
end run
