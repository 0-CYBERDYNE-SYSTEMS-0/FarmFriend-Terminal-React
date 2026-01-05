---
id: system_backup_core
title: System Backup Core Components
description: Core initialization, configuration, and utility functions for the System Backup solution
---
-- Configuration properties (customize as needed)
property backupSourceFolders : {} -- Will be set by user
property backupDestination : "" -- Will be set by user
property backupName : "MacBackup"
property dateFormat : "yyyyMMdd-HHmmss"
property compressionEnabled : true
property encryptionEnabled : false
property encryptionPassword : ""
property incrementalBackup : true
property maxBackupSets : 5 -- Number of backup sets to keep
property excludePatterns : {".DS_Store", "*.tmp", "*/Caches/*", "*/Trash/*"}
property logEnabled : true
property logFile : "~/Library/Logs/MacBackup.log"
