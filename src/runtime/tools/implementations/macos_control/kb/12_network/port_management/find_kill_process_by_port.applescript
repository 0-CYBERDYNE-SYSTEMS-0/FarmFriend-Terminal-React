---
id: find_kill_process_by_port
title: Find and Kill Process by Port Number
description: Whether to kill the process if found (true/false)
---
-- Find which process is using a specific port and optionally kill it
on findProcessByPort(portNumber, shouldKill)
    set portNumber to portNumber as string
    
    try
        -- Check if any process is using this port
        set portCheckCommand to "lsof -nP -iTCP:" & portNumber & " -sTCP:LISTEN"
        set portCheckResult to do shell script portCheckCommand
        
        -- Extract PID and process name directly from lsof output
        -- Format the command to extract both in one go to avoid empty result issues
        set pidAndName to do shell script "echo " & quoted form of portCheckResult & " | awk 'NR>1 {print $2 \"|\" $1}' | head -1"
        
        -- Split the result to get PID and process name
        set AppleScript's text item delimiters to "|"
        set pidAndNameItems to text items of pidAndName
        set pid to item 1 of pidAndNameItems
        set processName to item 2 of pidAndNameItems
        set AppleScript's text item delimiters to ""
        
        -- Create result message
        set resultMessage to "Port " & portNumber & " is being used by " & processName & " (PID: " & pid & ")"
        
        -- Kill the process if requested
        if shouldKill is true then
            do shell script "kill -9 " & pid
            set resultMessage to resultMessage & ". Process has been terminated."
        end if
        
        return resultMessage
    on error errorMessage
        if errorMessage contains "pattern not found" or errorMessage contains "not a valid process ID" then
            return "No process found using port " & portNumber
        else
            return "Error: " & errorMessage
        end if
    end try
end findProcessByPort

-- Run with parameters
findProcessByPort({portNumber}--, {shouldKill}--)
