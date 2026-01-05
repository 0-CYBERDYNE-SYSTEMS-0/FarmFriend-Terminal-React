---
id: iterm_send_text
title: Send Text to iTerm2 Without Executing
description: >-
      Target session by criteria - number, name, or "active" (default is
      "active")
---
on run {input, parameters}
    set textToSend to "{text}"
    set executeCommand to "{executeCommand}"
    set targetSession to "{targetSession}"
    
    -- Validate and set defaults for parameters
    if textToSend is "" or textToSend is missing value then
        return "Error: No text provided to send to iTerm2."
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
    
    if targetSession is "" or targetSession is missing value then
        set targetSession to "active"
    end if
    
    tell application "iTerm"
        activate
        
        -- Determine which session to target
        set theSession to my getTargetSession(targetSession)
        if theSession is missing value then
            return "Error: Could not find the specified session."
        end if
        
        -- Process special characters in the text
        set processedText to my processTextForITerm(textToSend)
        
        tell theSession
            -- Send the text to the session
            write text processedText without newline
            
            -- Optionally press Return/Enter to execute the command
            if executeCommand then
                write text ""
                return "Text sent to iTerm2 and executed: " & textToSend
            else
                return "Text sent to iTerm2 without execution: " & textToSend
            end if
        end tell
    end tell
end run

-- Helper function to get the target session based on criteria
on getTargetSession(criteria)
    tell application "iTerm"
        -- Check if iTerm has any windows open
        if (count of windows) is 0 then
            create window with default profile
            delay 0.5
        end if
        
        -- Handle different targeting methods
        if criteria is "active" then
            -- Get the active session
            return current session of current window
            
        else
            -- Try to interpret as a session number (tab/pane index)
            try
                set sessionIndex to criteria as integer
                if sessionIndex > 0 then
                    if sessionIndex ≤ (count of sessions of current window) then
                        return session sessionIndex of current window
                    end if
                end if
            on error
                -- Not a number, so try as a session name
                try
                    tell current window
                        repeat with aSession in sessions
                            if name of aSession contains criteria then
                                return aSession
                            end if
                        end repeat
                    end tell
                on error
                    -- If nothing found, return missing value
                    return missing value
                end try
            end try
        end if
        
        -- Default to current session if nothing matched
        return current session of current window
    end tell
end getTargetSession

-- Helper function to process special characters in text for iTerm
on processTextForITerm(inputText)
    -- Replace literal newlines with a special sequence
    -- This ensures multi-line text is properly sent
    set AppleScript's text item delimiters to return
    set textItems to text items of inputText
    set AppleScript's text item delimiters to ""
    
    -- Join the text items back together with literal newlines
    return textItems as text
end processTextForITerm
