---
id: system_backup_engine
title: System Backup Engine
description: Core backup and restore functionality for the System Backup solution
---
-- Perform the backup operation
on performBackup()
  try
    -- Initialize
    initializeBackup()
    
    -- Validate configuration
    set validationResult to validateSources()
    if validationResult starts with "ERROR:" then
      return validationResult
    end if
    
    -- Create destination
    set destinationResult to createBackupDestination()
    if destinationResult starts with "ERROR:" then
      return destinationResult
    end if
    
    -- Generate backup folder name with date
    set backupDate to formatDate()
    set backupFolder to backupDestination & "/" & backupName & "_" & backupDate
    
    logMessage("Starting backup to: " & backupFolder)
    
    -- Create the exclude patterns file
    set excludeFile to createExcludeFile()
    
    -- Prepare the backup commands
    if encryptionEnabled then
      -- Create an encrypted disk image for backup
      set dmgSize to "8g" -- Default size, adjust as needed
      set dmgPath to backupFolder & ".dmg"
      
      logMessage("Creating encrypted disk image: " & dmgPath)
      
      -- Create the encrypted disk image
      set createDmgCmd to "hdiutil create -size " & dmgSize & " -encryption -stdinpass -volname " & quoted form of backupName & " -fs APFS " & quoted form of dmgPath
      
      do shell script createDmgCmd & " <<< " & quoted form of encryptionPassword
      
      -- Mount the disk image
      set mountDmgCmd to "echo " & quoted form of encryptionPassword & " | hdiutil attach -stdinpass " & quoted form of dmgPath
      set mountOutput to do shell script mountDmgCmd
      
      -- Extract the mount point
      set mountPoint to do shell script "echo " & quoted form of mountOutput & " | grep /Volumes | awk '{print $NF}'"
      
      -- Update the backup folder to the mounted image
      set backupFolder to mountPoint
    else
      -- Create the regular backup folder
      do shell script "mkdir -p " & quoted form of backupFolder
    end if
    
    -- Perform the backup for each source folder
    repeat with sourceFolder in backupSourceFolders
      set sourceName to do shell script "basename " & quoted form of sourceFolder
      set targetFolder to backupFolder & "/" & sourceName
      
      logMessage("Backing up: " & sourceFolder & " to " & targetFolder)
      
      -- Create the rsync command
      set rsyncOptions to "-a" -- Archive mode
      
      if incrementalBackup then
        set rsyncOptions to rsyncOptions & "u" -- Update only
      end if
      
      if compressionEnabled then
        set rsyncOptions to rsyncOptions & "z" -- Compression
      end if
      
      -- Add verbose and human-readable options
      set rsyncOptions to rsyncOptions & "vh"
      
      set rsyncCmd to "rsync " & rsyncOptions & " --exclude-from=" & quoted form of excludeFile & " " & quoted form of sourceFolder & " " & quoted form of backupFolder
      
      -- Execute the rsync command
      set rsyncOutput to do shell script rsyncCmd
      
      logMessage("Backup completed for: " & sourceFolder)
    end repeat
    
    -- Clean up temporary exclude file
    do shell script "rm " & quoted form of excludeFile
    
    -- Unmount encrypted disk image if used
    if encryptionEnabled then
      do shell script "hdiutil detach " & quoted form of backupFolder
      logMessage("Unmounted encrypted backup disk image")
    end if
    
    -- Clean up old backups based on retention policy
    cleanupOldBackups()
    
    logMessage("Backup completed successfully")
    return "Backup completed successfully to " & backupFolder
  on error errMsg
    logMessage("Error during backup: " & errMsg)
    return "ERROR during backup: " & errMsg
  end try
end performBackup
