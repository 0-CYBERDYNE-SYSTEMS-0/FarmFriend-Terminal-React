---
id: pomodoro_focus
title: Pomodoro Focus Timer with Distractions Management
description: >-
      Comma-separated list of distracting apps to quit (e.g.,
      'Slack,Mail,Messages')
---
on run {input, parameters}
    set durationMinutes to "{durationMinutes}"
    set distractingApps to "{distractingApps}"
    
    -- Set default duration if not specified
    if durationMinutes is "" or durationMinutes is missing value then
        set durationMinutes to 25
    else
        try
            set durationMinutes to durationMinutes as number
        on error
            display dialog "Invalid duration: " & durationMinutes & ". Please enter a number." buttons {"OK"} default button "OK" with icon stop
            return
        end try
    end if
    
    -- Set default distracting apps if not specified
    if distractingApps is "" or distractingApps is missing value then
        set distractingAppsList to {"Mail", "Messages", "Slack", "Discord", "Twitter", "Music"}
    else
        -- Convert comma-separated string to list
        set AppleScript's text item delimiters to ","
        set distractingAppsList to text items of distractingApps
        set AppleScript's text item delimiters to ""
    end if
    
    -- Store which apps were actually running
    set runningApps to {}
    
    -- Check and quit distracting apps
    repeat with appName in distractingAppsList
        tell application "System Events"
            if exists process appName then
                set end of runningApps to appName
                tell application appName to quit
            end if
        end tell
    end repeat
    
    -- Enable Do Not Disturb (Big Sur and later)
    try
        tell application "System Events"
            tell application process "ControlCenter"
                set frontmost to true
                click menu bar item "Focus" of menu bar 1
                delay 0.5
                click button "Do Not Disturb" of window 1
            end tell
        end tell
    on error
        -- Fallback for older macOS versions or if the above fails
        -- No reliable AppleScript method for older versions
        log "Could not enable Do Not Disturb automatically"
    end try
    
    -- Show start notification
    display notification "Focus session started for " & durationMinutes & " minutes" with title "Pomodoro Timer" sound name "Glass"
    
    -- Set the timer
    set durationSeconds to durationMinutes * 60
    set endTime to (current date) + durationSeconds
    
    -- Optional: Display a countdown (uncomment to use)
    --repeat while (current date) < endTime
    --    set timeLeft to endTime - (current date)
    --    set minutesLeft to (timeLeft / 60) div 1
    --    set secondsLeft to (timeLeft mod 60)
    --    -- Update display somehow (could use a dialog with a timeout)
    --    delay 1
    --end repeat
    
    -- Wait for the timer to finish
    delay durationSeconds
    
    -- Timer completed
    display notification "Time to take a break!" with title "Pomodoro Timer Completed" subtitle "You focused for " & durationMinutes & " minutes" sound name "Glass"
    
    -- Disable Do Not Disturb (attempt for Big Sur and later)
    try
        tell application "System Events"
            tell application process "ControlCenter"
                set frontmost to true
                click menu bar item "Focus" of menu bar 1
                delay 0.5
                click button "Do Not Disturb" of window 1
            end tell
        end tell
    on error
        log "Could not disable Do Not Disturb automatically"
    end try
    
    -- Reopen apps that were closed
    repeat with appName in runningApps
        tell application appName to activate
    end repeat
    
    return "Completed " & durationMinutes & " minute Pomodoro session"
end run
