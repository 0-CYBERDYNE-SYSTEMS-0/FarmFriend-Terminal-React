---
id: ios_simulator_monitor_logs
title: iOS Simulator: Monitor and Filter App Logs
description: >-
  Monitors iOS Simulator logs and filters them by app or subsystem for real-time
  debugging.
---
{bundleID}
{filterString}
{deviceIdentifier}
{logLevel}

on monitorSimulatorLogs(bundleID, filterString, deviceIdentifier, logLevel)
  -- Default to booted device if not specified
  if deviceIdentifier is missing value or deviceIdentifier is "" then
    set deviceIdentifier to "booted"
  end if
  
  -- Default log level to 'default' if not specified
  if logLevel is missing value or logLevel is "" then
    set logLevel to "default"
  else
    -- Normalize to lowercase
    set logLevel to do shell script "echo " & quoted form of logLevel & " | tr '[:upper:]' '[:lower:]'"
    
    -- Validate log level
    if logLevel is not in {"debug", "info", "default", "error", "fault"} then
      set logLevel to "default"
    end if
  end if
  
  try
    -- Check if device exists and is booted
    if deviceIdentifier is not "booted" then
      set checkDeviceCmd to "xcrun simctl list devices | grep '" & deviceIdentifier & "'"
      try
        do shell script checkDeviceCmd
      on error
        return "error: Device '" & deviceIdentifier & "' not found. Use 'booted' for the currently booted device, or check available devices."
      end try
    end if
    
    -- Build the log command with proper filters
    set logCmd to "xcrun simctl spawn " & quoted form of deviceIdentifier & " log stream --level=" & logLevel
    
    -- Add bundle ID filter if provided
    if bundleID is not missing value and bundleID is not "" then
      set logCmd to logCmd & " --predicate 'subsystem contains \"" & bundleID & "\"'"
    end if
    
    -- Create a unique timestamp for the log file name
    set timeStamp to do shell script "date +%Y%m%d_%H%M%S"
    set logFilePath to "/tmp/simulator_log_" & timeStamp & ".txt"
    
    -- Create a shell script that will run the log command, apply grep filter if any, and allow user to exit with Ctrl+C
    set scriptContent to "#!/bin/bash
echo \"Starting iOS Simulator log monitoring...\"
echo \"Log file will be saved to: " & logFilePath & "\"
echo \"Press Ctrl+C to stop monitoring\"
echo \"------------------------------------\"
" & logCmd
    
    -- Add grep filter if provided
    if filterString is not missing value and filterString is not "" then
      set scriptContent to scriptContent & " | grep -i '" & filterString & "'"
    end if
    
    -- Add tee to capture output to a file
    set scriptContent to scriptContent & " | tee " & quoted form of logFilePath
    
    -- Write the script to a temporary file
    set scriptPath to "/tmp/log_monitor_" & timeStamp & ".sh"
    do shell script "echo " & quoted form of scriptContent & " > " & quoted form of scriptPath
    do shell script "chmod +x " & quoted form of scriptPath
    
    -- Run the script in Terminal
    tell application "Terminal"
      do script quoted form of scriptPath & "; exit"
      activate
    end tell
    
    set filterDetails to ""
    if bundleID is not missing value and bundleID is not "" then
      set filterDetails to filterDetails & "App Bundle ID: " & bundleID & "
"
    end if
    
    if filterString is not missing value and filterString is not "" then
      set filterDetails to filterDetails & "Additional Filter: " & filterString & "
"
    end if
    
    if filterDetails is not "" then
      set filterDetails to "
Filters applied:
" & filterDetails
    end if
    
    return "Started monitoring iOS Simulator logs in a new Terminal window.

Device: " & deviceIdentifier & "
Log Level: " & logLevel & filterDetails & "
Log file: " & logFilePath & "

The Terminal window will continue showing logs until you press Ctrl+C.
Even after closing, the logs will remain available in the log file."
  on error errMsg number errNum
    return "error (" & errNum & ") monitoring simulator logs: " & errMsg
  end try
end monitorSimulatorLogs

return my monitorSimulatorLogs("{bundleID}", "{filterString}", "{deviceIdentifier}", "{logLevel}")
