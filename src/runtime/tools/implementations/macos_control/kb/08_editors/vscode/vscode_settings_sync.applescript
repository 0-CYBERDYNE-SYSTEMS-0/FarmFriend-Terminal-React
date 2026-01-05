---
id: vscode_settings_sync
title: Sync VS Code Settings Between Machines
description: Whether to include extensions in the backup (true/false)
---
on run {input, parameters}
    set backupPath to "{backupPath}"
    set includeExtensions to "{includeExtensions}"
    
    if backupPath is "" or backupPath is missing value then
        display dialog "Please provide a path to save the VS Code settings backup." buttons {"OK"} default button "OK" with icon stop
        return
    end if
    
    -- Set defaults if not provided
    if includeExtensions is "" or includeExtensions is missing value then
        set includeExtensions to "true"
    end if
    
    -- Ensure backup directory exists
    do shell script "mkdir -p " & quoted form of backupPath
    
    -- Get VS Code user directory paths
    set homeFolder to POSIX path of (path to home folder)
    set vscodePath to homeFolder & "Library/Application Support/Code/User/"
    
    -- Create timestamp for backup
    set timestamp to do shell script "date +%Y%m%d_%H%M%S"
    set backupFolder to backupPath & "/vscode_backup_" & timestamp
    
    -- Create backup directory
    do shell script "mkdir -p " & quoted form of backupFolder
    
    -- Copy settings files to backup location
    do shell script "cp " & quoted form of (vscodePath & "settings.json") & " " & quoted form of backupFolder & " 2>/dev/null || echo 'No settings.json found'"
    do shell script "cp " & quoted form of (vscodePath & "keybindings.json") & " " & quoted form of backupFolder & " 2>/dev/null || echo 'No keybindings.json found'"
    
    -- Copy snippets if they exist
    do shell script "cp -r " & quoted form of (vscodePath & "snippets") & " " & quoted form of backupFolder & " 2>/dev/null || echo 'No snippets found'"
    
    -- Generate extensions list if requested
    if includeExtensions is "true" then
        try
            -- Check if VS Code is installed
            do shell script "which code"
            
            -- Export the list of installed extensions
            set extensionsList to do shell script "code --list-extensions"
            
            -- Create install script for extensions
            set installScript to "#!/bin/bash" & return & return
            set installScript to installScript & "# VS Code Extensions installation script" & return
            set installScript to installScript & "# Generated on " & timestamp & return & return
            
            if extensionsList is not "" then
                set AppleScript's text item delimiters to return
                set extensions to text items of extensionsList
                set AppleScript's text item delimiters to ""
                
                repeat with ext in extensions
                    set installScript to installScript & "code --install-extension " & ext & return
                end repeat
            end if
            
            -- Write script to file
            set installScriptPath to backupFolder & "/install_extensions.sh"
            do shell script "echo " & quoted form of installScript & " > " & quoted form of installScriptPath
            do shell script "chmod +x " & quoted form of installScriptPath
        on error
            display dialog "VS Code command line tools not found. Extensions list was not generated." buttons {"OK"} default button "OK" with icon caution
        end try
    end if
    
    -- Create restore script
    set restoreScript to "#!/bin/bash" & return & return
    set restoreScript to restoreScript & "# VS Code Settings restoration script" & return
    set restoreScript to restoreScript & "# Generated on " & timestamp & return & return
    set restoreScript to restoreScript & "VSCODE_USER_DIR=\"$HOME/Library/Application Support/Code/User/\"" & return & return
    set restoreScript to restoreScript & "# Create backup of current settings" & return
    set restoreScript to restoreScript & "mkdir -p \"$VSCODE_USER_DIR/backup_before_restore_" & timestamp & "\"" & return
    set restoreScript to restoreScript & "cp \"$VSCODE_USER_DIR/settings.json\" \"$VSCODE_USER_DIR/backup_before_restore_" & timestamp & "/\" 2>/dev/null || echo 'No current settings.json found'" & return
    set restoreScript to restoreScript & "cp \"$VSCODE_USER_DIR/keybindings.json\" \"$VSCODE_USER_DIR/backup_before_restore_" & timestamp & "/\" 2>/dev/null || echo 'No current keybindings.json found'" & return
    set restoreScript to restoreScript & "cp -r \"$VSCODE_USER_DIR/snippets\" \"$VSCODE_USER_DIR/backup_before_restore_" & timestamp & "/\" 2>/dev/null || echo 'No current snippets found'" & return & return
    set restoreScript to restoreScript & "# Restore settings from backup" & return
    set restoreScript to restoreScript & "cp \"" & backupFolder & "/settings.json\" \"$VSCODE_USER_DIR/\" 2>/dev/null || echo 'No settings.json in backup'" & return
    set restoreScript to restoreScript & "cp \"" & backupFolder & "/keybindings.json\" \"$VSCODE_USER_DIR/\" 2>/dev/null || echo 'No keybindings.json in backup'" & return
    set restoreScript to restoreScript & "cp -r \"" & backupFolder & "/snippets\" \"$VSCODE_USER_DIR/\" 2>/dev/null || echo 'No snippets in backup'" & return
    
    if includeExtensions is "true" then
        set restoreScript to restoreScript & return & "# To install extensions, run the install_extensions.sh script" & return
    end if
    
    -- Write restore script to file
    set restoreScriptPath to backupFolder & "/restore_settings.sh"
    do shell script "echo " & quoted form of restoreScript & " > " & quoted form of restoreScriptPath
    do shell script "chmod +x " & quoted form of restoreScriptPath
    
    return "VS Code settings backed up to " & backupFolder
end run
