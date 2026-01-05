---
id: vscode_run_command
title: Run VS Code command
description: The command to execute (e.g., ''workbench.action.terminal.toggleTerminal'')
---
on run {input, parameters}
    set commandToRun to "{command}"
    
    if commandToRun is "" or commandToRun is missing value then
        display dialog "Please provide a VS Code command to execute." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Activate VS Code
    tell application "Visual Studio Code"
        activate
    end tell
    
    -- Allow time for VS Code to be in focus
    delay 0.5
    
    -- Open command palette and run command
    tell application "System Events"
        tell process "Code"
            -- Open command palette (Cmd+Shift+P)
            keystroke "p" using {command down, shift down}
            delay 0.3
            
            -- Clear any existing command text
            key code 53 -- Escape key
            delay 0.1
            keystroke "p" using {command down, shift down}
            delay 0.3
            
            -- Enter the command
            keystroke ">" -- Prefix to run a command directly
            keystroke commandToRun
            delay 0.3
            keystroke return
        end tell
    end tell
    
    return "Executed VS Code command: " & commandToRun
end run
