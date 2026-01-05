---
id: terminal_send_control_character
title: Terminal: Send Control Character
description: >-
  Sends a control character (e.g., Ctrl-C, Escape) to the frontmost Terminal.app
  window by simulating keystrokes.
---
on runWithInput(inputData, legacyArguments)
    set charToSend to ""
    if inputData is not missing value and inputData contains {controlChar:""} then
        set charToSend to controlChar of inputData
    else
        return "Error: controlChar not provided in inputData. Expects e.g. { \"controlChar\": \"C\" }."
    end if

    if charToSend is "" then
        return "Error: controlChar was empty."
    end if
    
    -- MCP placeholder for input
    set charToSend to "{controlChar}" -- The control character to send (A-Z for Ctrl-A to Ctrl-Z, or ESC, or ])

    set upperChar to ""
    try
        string id (ASCII number of charToSend) -- crude way to check if it's a single char for ASCII number
        if (ASCII number of charToSend) is greater than or equal to (ASCII number of "a") and (ASCII number of charToSend) is less than or equal to (ASCII number of "z") then
            set upperChar to character id ((ASCII number of charToSend) - 32)
        else
            set upperChar to charToSend
        end if
    on error
        set upperChar to charToSend -- For multi-char like "ESC"
    end try


    tell application "Terminal"
        activate
        if not (exists window 1) then
            return "Error: Terminal.app has no windows open."
        end if
    end tell

    tell application "System Events"
        tell application process "Terminal"
            set frontmost to true
            delay 0.2 

            try
                if (length of upperChar is 1) and (upperChar is greater than or equal to "A") and (upperChar is less than or equal to "Z") then
                    keystroke (lower of upperChar) using control down
                    return "Sent Ctrl-" & upperChar & " to Terminal.app"
                else if upperChar is "ESC" then
                    key code 53 
                    return "Sent ESC to Terminal.app"
                else if upperChar is "]" then
                    keystroke "]" using control down 
                    return "Sent Ctrl-] to Terminal.app"
                else
                    return "Error: Unsupported controlChar value: '" & charToSend & "'. Supported: A-Z, ESC, ]."
                end if
            on error errMsg
                return "Error sending keystroke: " & errMsg
            end try
        end tell
    end tell
end runWithInput
