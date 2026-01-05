---
id: iterm_dynamic_profiles
title: Create iTerm2 Dynamic Profiles
description: Initial command to run when the profile is launched
---
on run {input, parameters}
    set profileName to "{profileName}"
    set profileColor to "{profileColor}"
    set command to "{command}"
    
    if profileName is "" or profileName is missing value then
        display dialog "Please provide a name for the profile." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Set defaults if not provided
    if profileColor is "" or profileColor is missing value then
        set profileColor to "0,0,0"
    end if
    
    if command is "" or command is missing value then
        set command to ""
    end if
    
    -- Generate a unique GUID for the profile
    set profileGuid to do shell script "uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'"
    
    -- Create dynamic profiles directory if it doesn't exist
    set dynamicProfilesDir to (POSIX path of (path to home folder)) & "Library/Application Support/iTerm2/DynamicProfiles"
    do shell script "mkdir -p " & quoted form of dynamicProfilesDir
    
    -- Create the profile JSON content
    set profileJson to "{
  \"Profiles\": [
    {
      \"Name\": \"" & profileName & "\",
      \"Guid\": \"" & profileGuid & "\",
      \"Dynamic Profile Parent Name\": \"Default\",
      \"Custom Command\": \"Yes\",
      \"Command\": \"" & command & "\",
      \"Background Color\": {
        \"Red Component\": " & getRedComponent(profileColor) & ",
        \"Green Component\": " & getGreenComponent(profileColor) & ",
        \"Blue Component\": " & getBlueComponent(profileColor) & "
      },
      \"Cursor Color\": {
        \"Red Component\": 0.73333334922790527,
        \"Green Component\": 0.73333334922790527,
        \"Blue Component\": 0.73333334922790527
      },
      \"Scrollback Lines\": 5000,
      \"Use Italic Font\": true,
      \"Use Bold Font\": true,
      \"Silence Bell\": true
    }
  ]
}"
    
    -- Write the profile to a file
    set profileFilePath to dynamicProfilesDir & "/" & profileName & ".json"
    do shell script "echo " & quoted form of profileJson & " > " & quoted form of profileFilePath
    
    -- Force iTerm2 to reload dynamic profiles
    -- This only works if iTerm2 is running
    tell application "System Events"
        if exists process "iTerm2" then
            tell application "iTerm2" to activate
            -- Touch DynamicProfiles directory to trigger reload
            do shell script "touch " & quoted form of dynamicProfilesDir
        end if
    end tell
    
    return "Created iTerm2 dynamic profile '" & profileName & "' at " & profileFilePath
end run

-- Helper functions to convert color to RGB components

on getRedComponent(colorInput)
    -- Handle hex color code
    if colorInput starts with "#" then
        set hexColor to text 2 thru 7 of colorInput
        set redHex to text 1 thru 2 of hexColor
        return (hexToDecimal(redHex) / 255)
    end if
    
    -- Handle CSV format
    if colorInput contains "," then
        set AppleScript's text item delimiters to ","
        set colorParts to text items of colorInput
        set AppleScript's text item delimiters to ""
        return (item 1 of colorParts) as number
    end if
    
    -- Handle named colors
    if colorInput is "black" then
        return 0
    else if colorInput is "red" then
        return 1
    else if colorInput is "green" then
        return 0
    else if colorInput is "blue" then
        return 0
    else if colorInput is "white" then
        return 1
    else
        -- Default to black
        return 0
    end if
end getRedComponent

on getGreenComponent(colorInput)
    -- Handle hex color code
    if colorInput starts with "#" then
        set hexColor to text 2 thru 7 of colorInput
        set greenHex to text 3 thru 4 of hexColor
        return (hexToDecimal(greenHex) / 255)
    end if
    
    -- Handle CSV format
    if colorInput contains "," then
        set AppleScript's text item delimiters to ","
        set colorParts to text items of colorInput
        set AppleScript's text item delimiters to ""
        return (item 2 of colorParts) as number
    end if
    
    -- Handle named colors
    if colorInput is "black" then
        return 0
    else if colorInput is "red" then
        return 0
    else if colorInput is "green" then
        return 1
    else if colorInput is "blue" then
        return 0
    else if colorInput is "white" then
        return 1
    else
        -- Default to black
        return 0
    end if
end getGreenComponent

on getBlueComponent(colorInput)
    -- Handle hex color code
    if colorInput starts with "#" then
        set hexColor to text 2 thru 7 of colorInput
        set blueHex to text 5 thru 6 of hexColor
        return (hexToDecimal(blueHex) / 255)
    end if
    
    -- Handle CSV format
    if colorInput contains "," then
        set AppleScript's text item delimiters to ","
        set colorParts to text items of colorInput
        set AppleScript's text item delimiters to ""
        return (item 3 of colorParts) as number
    end if
    
    -- Handle named colors
    if colorInput is "black" then
        return 0
    else if colorInput is "red" then
        return 0
    else if colorInput is "green" then
        return 0
    else if colorInput is "blue" then
        return 1
    else if colorInput is "white" then
        return 1
    else
        -- Default to black
        return 0
    end if
end getBlueComponent

on hexToDecimal(hexString)
    set decimalValue to 0
    set hexChars to "0123456789ABCDEF"
    
    repeat with i from 1 to length of hexString
        set theChar to character i of hexString
        set charValue to (offset of (character i of hexString) in hexChars) - 1
        if charValue < 0 then set charValue to (offset of (character i of hexString) in "abcdef") + 9
        set decimalValue to decimalValue * 16 + charValue
    end repeat
    
    return decimalValue
end hexToDecimal
