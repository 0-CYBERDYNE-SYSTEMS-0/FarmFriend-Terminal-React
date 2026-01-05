---
id: jetbrains_run_action
title: Run action in JetBrains IDE
description: The name of the action to execute (e.g., ''Find in Files'', ''Build Project'')
---
on run {input, parameters}
    set ideName to "{ideName}"
    set actionName to "{actionName}"
    
    if ideName is "" or ideName is missing value then
        display dialog "Please specify a JetBrains IDE name (e.g., 'IntelliJ IDEA', 'WebStorm', 'PyCharm')." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    if actionName is "" or actionName is missing value then
        display dialog "Please specify an action name to execute." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Map the full IDE name to the process name
    set processName to ""
    if ideName contains "IntelliJ" then
        set processName to "idea"
    else if ideName is "WebStorm" then
        set processName to "webstorm"
    else if ideName is "PyCharm" then
        set processName to "pycharm"
    else if ideName is "CLion" then
        set processName to "clion"
    else if ideName is "PhpStorm" then
        set processName to "phpstorm"
    else if ideName is "Rider" then
        set processName to "rider"
    else if ideName is "GoLand" then
        set processName to "goland"
    else if ideName is "RubyMine" then
        set processName to "rubymine"
    else
        -- Fallback: Use lowercased version with no spaces
        set processName to do shell script "echo " & quoted form of ideName & " | tr '[:upper:]' '[:lower:]' | tr -d ' '"
    end if
    
    -- Activate the IDE
    tell application ideName
        activate
    end tell
    
    -- Allow time for the IDE to be in focus
    delay 0.5
    
    -- Execute the action using Find Action feature
    tell application "System Events"
        tell process processName
            -- Open Find Action (Cmd+Shift+A)
            keystroke "a" using {command down, shift down}
            delay 0.5
            
            -- Type the action name
            keystroke actionName
            delay 0.5
            
            -- Press Enter to execute
            keystroke return
        end tell
    end tell
    
    return "Executed action '" & actionName & "' in " & ideName
end run
