---
id: cursor_ai_commands
title: Trigger Cursor AI commands
description: >-
      Command to execute (generate, explain, chat, improve, fix_errors,
      complete_code)
---
on run {input, parameters}
    set aiCommand to "{command}"
    
    if aiCommand is "" or aiCommand is missing value then
        display dialog "Please specify a Cursor AI command (generate, explain, chat, improve, fix_errors, complete_code)." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Activate Cursor editor
    tell application "Cursor"
        activate
    end tell
    
    -- Allow time for Cursor to be in focus
    delay 0.5
    
    -- Execute the AI command using keyboard shortcuts
    tell application "System Events"
        tell process "Cursor"
            if aiCommand is "generate" then
                -- Trigger "Generate Code" (Cmd+K)
                keystroke "k" using {command down}
                
            else if aiCommand is "explain" then
                -- Select code if not already selected
                keystroke "a" using {command down}
                
                -- Trigger "Explain Code" (Cmd+L)
                keystroke "l" using {command down}
                
            else if aiCommand is "chat" then
                -- Trigger AI Chat (Cmd+Shift+L)
                keystroke "l" using {command down, shift down}
                
            else if aiCommand is "improve" then
                -- Select code if not already selected
                keystroke "a" using {command down}
                
                -- Trigger "Improve Code" (Cmd+I)
                keystroke "i" using {command down}
                
            else if aiCommand is "fix_errors" then
                -- Trigger "Fix Errors" (Cmd+Shift+I)
                keystroke "i" using {command down, shift down}
                
            else if aiCommand is "complete_code" then
                -- Trigger code completion (Tab or Enter depending on context)
                keystroke tab
                
            else
                display dialog "Unsupported Cursor AI command: " & aiCommand buttons {"OK"} default button "OK" with icon stop
                return
            end if
        end tell
    end tell
    
    return "Executed Cursor AI command: " & aiCommand
end run
