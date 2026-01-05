---
id: system_sleep_wake_control
title: System Sleep and Wake Control
description: >-
  Controls system sleep, wake, shutdown, and restart events with various options
  and scheduling
---
-- Put the system to sleep immediately
on sleepSystem()
  tell application "System Events" to sleep
  return "Sleep command sent to system"
end sleepSystem

-- Restart the system with confirmation dialog
on restartSystem()
  tell application "System Events"
    set dialogResult to display dialog "Are you sure you want to restart?" buttons {"Cancel", "Restart"} default button "Restart" with icon caution
    if button returned of dialogResult is "Restart" then
      restart
      return "Restart command sent to system"
    else
      return "Restart cancelled"
    end if
  end tell
end restartSystem

-- Shutdown the system with confirmation dialog
on shutdownSystem()
  tell application "System Events"
    set dialogResult to display dialog "Are you sure you want to shut down?" buttons {"Cancel", "Shut Down"} default button "Shut Down" with icon caution
    if button returned of dialogResult is "Shut Down" then
      shut down
      return "Shutdown command sent to system"
    else
      return "Shutdown cancelled"
    end if
  end tell
end shutdownSystem

-- Log out the current user with confirmation dialog
on logoutUser()
  tell application "System Events"
    set dialogResult to display dialog "Are you sure you want to log out?" buttons {"Cancel", "Log Out"} default button "Log Out" with icon caution
    if button returned of dialogResult is "Log Out" then
      log out
      return "Logout command sent to system"
    else
      return "Logout cancelled"
    end if
  end tell
end logoutUser

-- Schedule sleep after delay (in minutes)
on scheduleSleep(minutesToWait)
  set secondsToWait to minutesToWait * 60
  set timeToSleep to secondsToWait / 60
  
  display notification "System will sleep in " & minutesToWait & " minutes" with title "Sleep Scheduled"
  
  delay secondsToWait
  sleepSystem()
  
  return "Sleep scheduled after " & minutesToWait & " minutes"
end scheduleSleep

-- Prevent system sleep for specified duration (in minutes)
on preventSleep(durationMinutes)
  -- Uses caffeinate command-line tool to prevent sleep
  set durationSeconds to durationMinutes * 60
  
  do shell script "caffeinate -d -t " & durationSeconds & " &"
  
  display notification "System will stay awake for " & durationMinutes & " minutes" with title "Sleep Prevention Active"
  
  return "System sleep prevented for " & durationMinutes & " minutes"
end preventSleep

-- Cancel scheduled sleep prevention
on cancelSleepPrevention()
  do shell script "pkill caffeinate"
  return "Sleep prevention cancelled"
end cancelSleepPrevention

-- Advanced: Configure system sleep settings using pmset
on configureSleepSettings(displaySleepMinutes, systemSleepMinutes, harddiskSleepMinutes)
  try
    -- Requires admin privileges - will prompt for password
    do shell script "pmset -a displaysleep " & displaySleepMinutes & " sleep " & systemSleepMinutes & " disksleep " & harddiskSleepMinutes with administrator privileges
    
    return "Sleep settings configured: Display: " & displaySleepMinutes & "m, System: " & systemSleepMinutes & "m, Hard Disk: " & harddiskSleepMinutes & "m"
  on error errMsg
    return "Error configuring sleep settings: " & errMsg
  end try
end configureSleepSettings

-- Get current power management settings
on getPowerSettings()
  set powerSettings to do shell script "pmset -g"
  return powerSettings
end getPowerSettings

-- Schedule system startup/wake at specific time
on scheduleWake(hour, minute)
  try
    -- Convert to 24-hour format if needed
    set hour24 to hour
    
    -- Format time as HH:MM (with leading zeros if needed)
    set hourStr to text -2 thru -1 of ("0" & hour24)
    set minuteStr to text -2 thru -1 of ("0" & minute)
    
    -- Schedule wake with pmset (requires admin privileges)
    do shell script "pmset repeat wake MTWRFSU " & hourStr & ":" & minuteStr with administrator privileges
    
    return "System wake scheduled for " & hourStr & ":" & minuteStr & " daily"
  on error errMsg
    return "Error scheduling wake: " & errMsg
  end try
end scheduleWake

-- Cancel all scheduled power events
on cancelScheduledPowerEvents()
  try
    do shell script "pmset repeat cancel" with administrator privileges
    return "All scheduled power events cancelled"
  on error errMsg
    return "Error cancelling power events: " & errMsg
  end try
end cancelScheduledPowerEvents

-- Force system restart (with admin privileges)
on forceRestart()
  try
    do shell script "shutdown -r now" with administrator privileges
    return "Force restart initiated"
  on error errMsg
    return "Error forcing restart: " & errMsg
  end try
end forceRestart

-- Force system shutdown (with admin privileges)
on forceShutdown()
  try
    do shell script "shutdown -h now" with administrator privileges
    return "Force shutdown initiated"
  on error errMsg
    return "Error forcing shutdown: " & errMsg
  end try
end forceShutdown

-- Example usage: Menu for common power operations
on showPowerMenu()
  set powerOptions to {"Sleep Now", "Restart", "Shut Down", "Log Out", "Sleep in 30 Minutes", "Prevent Sleep for 60 Minutes", "Show Power Settings", "Cancel Scheduled Power Events", "Cancel"}
  
  set selectedOption to choose from list powerOptions with prompt "Select Power Operation:" default items {"Sleep Now"}
  
  if selectedOption is false then
    return "Operation cancelled"
  else
    set operation to item 1 of selectedOption
    
    if operation is "Sleep Now" then
      return sleepSystem()
    else if operation is "Restart" then
      return restartSystem()
    else if operation is "Shut Down" then
      return shutdownSystem()
    else if operation is "Log Out" then
      return logoutUser()
    else if operation is "Sleep in 30 Minutes" then
      return scheduleSleep(30)
    else if operation is "Prevent Sleep for 60 Minutes" then
      return preventSleep(60)
    else if operation is "Show Power Settings" then
      return getPowerSettings()
    else if operation is "Cancel Scheduled Power Events" then
      return cancelScheduledPowerEvents()
    else
      return "Operation cancelled"
    end if
  end if
end showPowerMenu

-- Run the power management menu
showPowerMenu()
