---
id: ghostty_automation
title: Automate Ghostty Terminal
description: Working directory to start in
---
on run {input, parameters}
    set command to "{command}"
    set workDir to "{workDir}"
    
    -- Set default working directory if not specified
    if workDir is "" or workDir is missing value then
        set workDir to "~"
    end if
    
    -- Check if Ghostty is installed
    try
        do shell script "osascript -e 'exists application \"Ghostty\"'"
    on error
        display dialog "Ghostty terminal application is not installed on this system." buttons {"OK"} default button "OK" with icon stop
        return
    end try
    
    -- Launch Ghostty and execute command if provided
    tell application "Ghostty"
        activate
    end tell
    
    -- Allow time for Ghostty to launch
    delay 0.5
    
    -- Change to working directory
    if workDir is not "~" then
        sendTextToGhostty("cd " & workDir)
    end if
    
    -- Execute command if provided
    if command is not "" and command is not missing value then
        sendTextToGhostty(command)
    end if
    
    return "Ghostty terminal opened" & (if command is not "" and command is not missing value then " and executed: " & command else "")
end run

-- Helper function to send text to Ghostty
on sendTextToGhostty(text_to_send)
    tell application "System Events"
        tell process "Ghostty"
            set frontmost to true
            delay 0.3
            keystroke text_to_send
            keystroke return
        end tell
    end tell
end sendTextToGhostty
