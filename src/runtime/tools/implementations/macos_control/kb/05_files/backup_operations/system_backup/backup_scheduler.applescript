---
id: system_backup_scheduler
title: System Backup Scheduler
description: Scheduling functionality for automated backups using launchd
---
-- Schedule a backup (using launchd)
on scheduleBackup(frequency)
  try
    set scriptPath to path to me as string
    set plistLabel to "com.user.backup." & backupName
    set plistPath to "~/Library/LaunchAgents/" & plistLabel & ".plist"
    
    -- Expand the path
    set expandedPlistPath to do shell script "echo " & quoted form of plistPath
    
    -- Determine the schedule
    set startCalendarInterval to ""
    
    if frequency is "daily" then
      set startCalendarInterval to "<key>StartCalendarInterval</key>
      <dict>
        <key>Hour</key>
        <integer>1</integer>
        <key>Minute</key>
        <integer>0</integer>
      </dict>"
    else if frequency is "weekly" then
      set startCalendarInterval to "<key>StartCalendarInterval</key>
      <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>1</integer>
        <key>Minute</key>
        <integer>0</integer>
      </dict>"
    else if frequency is "monthly" then
      set startCalendarInterval to "<key>StartCalendarInterval</key>
      <dict>
        <key>Day</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>1</integer>
        <key>Minute</key>
        <integer>0</integer>
      </dict>"
    end if
    
    -- Create the plist content
    set plistContent to "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>" & plistLabel & "</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/osascript</string>
        <string>" & (POSIX path of scriptPath) & "</string>
        <string>run_backup</string>
    </array>
    " & startCalendarInterval & "
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>"
    
    -- Write the plist file
    do shell script "echo " & quoted form of plistContent & " > " & quoted form of expandedPlistPath
    
    -- Load the launchd job
    do shell script "launchctl load " & quoted form of expandedPlistPath
    
    logMessage("Scheduled " & frequency & " backup")
    return "Backup scheduled: " & frequency
  on error errMsg
    logMessage("Error scheduling backup: " & errMsg)
    return "ERROR scheduling backup: " & errMsg
  end try
end scheduleBackup
