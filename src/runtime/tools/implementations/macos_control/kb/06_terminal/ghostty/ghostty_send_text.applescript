---
id: ghostty_send_text
title: Send Text to Ghostty Without Executing
description: Whether to press Return after sending the text (default: false)
---
on run {input, parameters}
    set textToSend to "{text}"
    set executeCommand to "{executeCommand}"
    
    -- Validate and set defaults for parameters
    if textToSend is "" or textToSend is missing value then
        return "Error: No text provided to send to Ghostty."
    end if
    
    if executeCommand is "" or executeCommand is missing value then
        set executeCommand to false
    else
        try
            set executeCommand to executeCommand as boolean
        on error
            set executeCommand to false
        end try
    end if
    
    -- Check if Ghostty is installed and running
    try
        tell application "System Events"
            set ghosttyRunning to exists process "Ghostty"
        end tell
        
        if not ghosttyRunning then
            tell application "Ghostty" to activate
            delay 1 -- Give Ghostty time to start up
        end if
    on error
        return "Error: Ghostty terminal application is not installed or cannot be started."
    end try
    
    -- Process multi-line text for sending
    set processedText to my processTextForTerminal(textToSend)
    
    -- Send the text to Ghostty using System Events
    tell application "System Events"
        tell process "Ghostty"
            set frontmost to true
            delay 0.3 -- Give window time to activate
            
            -- Send the text
            keystroke processedText
            
            -- Optionally press Return/Enter to execute the command
            if executeCommand then
                keystroke return
                return "Text sent to Ghostty and executed: " & textToSend
            else
                return "Text sent to Ghostty without execution: " & textToSend
            end if
        end tell
    end tell
end run

-- Helper function to process special characters in text for terminal input
on processTextForTerminal(inputText)
    -- For System Events keystroke, text is sent as-is including newlines
    -- No special processing needed, but this function allows for customization
    return inputText
end processTextForTerminal
