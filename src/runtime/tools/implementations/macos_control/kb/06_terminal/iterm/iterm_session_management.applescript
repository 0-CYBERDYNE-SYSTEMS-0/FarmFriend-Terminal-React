---
id: iterm_session_management
title: iTerm2 Session Management
description: Whether to save terminal contents (true/false, default false)
---
on run {input, parameters}
    set action to "{action}"
    set arrangementName to "{name}"
    set includeContents to "{includeContents}"
    
    -- Validate and set defaults for parameters
    if action is "" or action is missing value then
        return "Error: Please specify an action (save, restore, list, or delete)"
    end if
    
    -- Convert parameters to lowercase for case-insensitive comparison
    set action to my toLowerCase(action)
    
    -- Set default arrangement name if not provided
    if arrangementName is "" or arrangementName is missing value then
        if action is "list" then
            -- For list action, we don't need a name
        else
            set arrangementName to "Default"
        end if
    end if
    
    -- Set default for includeContents
    if includeContents is "" or includeContents is missing value then
        set includeContents to false
    else
        try
            set includeContents to includeContents as boolean
        on error
            set includeContents to false
        end try
    end if
    
    -- Check if iTerm2 is running
    tell application "System Events"
        if not (exists process "iTerm2") then
            if action is "restore" then
                tell application "iTerm2" to activate
                delay 1 -- Give iTerm2 time to launch
            else if action is "list" then
                -- For listing, we don't need iTerm2 to be running
            else
                return "Error: iTerm2 is not running."
            end if
        end if
    end tell
    
    -- Perform the requested action
    if action is "save" then
        return saveArrangement(arrangementName, includeContents)
    else if action is "restore" then
        return restoreArrangement(arrangementName)
    else if action is "list" then
        return listArrangements()
    else if action is "delete" then
        return deleteArrangement(arrangementName)
    else
        return "Error: Invalid action. Use 'save', 'restore', 'list', or 'delete'."
    end if
end run

-- Save the current window arrangement
on saveArrangement(arrangementName, includeContents)
    tell application "iTerm2"
        activate
        
        -- Use the Arrangements submenu via UI automation
        tell application "System Events"
            tell process "iTerm2"
                set frontmost to true
                delay 0.3
                
                -- Select Window > Save Window Arrangement...
                click menu item "Save Window Arrangement…" of menu "Window" of menu bar 1
                delay 0.3
                
                -- Now handle the dialog with the name field
                set arrangementDialog to window "Save Window Arrangement"
                
                -- Enter the arrangement name
                set value of text field 1 of arrangementDialog to arrangementName
                
                -- Set the checkbox for including contents if needed
                if includeContents then
                    -- Check if the checkbox exists and set it
                    try
                        set theCheckbox to checkbox "Include contents of tabs" of arrangementDialog
                        if value of theCheckbox is 0 then
                            click theCheckbox
                        end if
                    on error
                        -- If the checkbox doesn't exist or has a different name, just continue
                    end try
                end if
                
                -- Click the Save button
                click button "Save" of arrangementDialog
                
                return "Saved current window arrangement as '" & arrangementName & "'."
            end tell
        end tell
    end tell
end saveArrangement

-- Restore a previously saved window arrangement
on restoreArrangement(arrangementName)
    tell application "iTerm2"
        activate
        
        -- Check if the arrangement exists
        set arrangementExists to false
        set existingArrangements to my getExistingArrangements()
        
        repeat with i from 1 to count of existingArrangements
            if item i of existingArrangements is arrangementName then
                set arrangementExists to true
                exit repeat
            end if
        end repeat
        
        if not arrangementExists then
            return "Error: No saved arrangement found with name '" & arrangementName & "'."
        end if
        
        -- Use the Arrangements submenu via UI automation
        tell application "System Events"
            tell process "iTerm2"
                set frontmost to true
                delay 0.3
                
                -- Navigate to the Window menu
                tell menu bar 1
                    tell menu bar item "Window"
                        tell menu "Window"
                            tell menu item "Restore Window Arrangement"
                                -- Click on the specific arrangement name in the submenu
                                tell menu "Restore Window Arrangement"
                                    click menu item arrangementName
                                end tell
                            end tell
                        end tell
                    end tell
                end tell
                
                return "Restored window arrangement '" & arrangementName & "'."
            end tell
        end tell
    end tell
end restoreArrangement

-- List all saved window arrangements
on listArrangements()
    set existingArrangements to my getExistingArrangements()
    
    if (count of existingArrangements) is 0 then
        return "No saved window arrangements found."
    else
        set arrangementsList to "Available window arrangements:
"
        
        repeat with i from 1 to count of existingArrangements
            set arrangementsList to arrangementsList & "• " & item i of existingArrangements & "
"
        end repeat
        
        return arrangementsList
    end if
end listArrangements

-- Delete a saved window arrangement
on deleteArrangement(arrangementName)
    tell application "iTerm2"
        activate
        
        -- Check if the arrangement exists
        set arrangementExists to false
        set existingArrangements to my getExistingArrangements()
        
        repeat with i from 1 to count of existingArrangements
            if item i of existingArrangements is arrangementName then
                set arrangementExists to true
                exit repeat
            end if
        end repeat
        
        if not arrangementExists then
            return "Error: No saved arrangement found with name '" & arrangementName & "'."
        end if
        
        -- Use the Arrangements management dialog via UI automation
        tell application "System Events"
            tell process "iTerm2"
                set frontmost to true
                delay 0.3
                
                -- Navigate to the Window menu
                tell menu bar 1
                    tell menu bar item "Window"
                        tell menu "Window"
                            click menu item "Manage Window Arrangements…"
                            delay 0.3
                        end tell
                    end tell
                end tell
                
                -- Handle the Manage Window Arrangements dialog
                set manageDialog to window "Window Arrangements"
                
                -- Select the arrangement to delete in the table
                tell table 1 of scroll area 1 of manageDialog
                    set selectedRow to 0
                    
                    -- Find and select the row with our arrangement name
                    repeat with i from 1 to count of rows
                        if value of text field 1 of row i is arrangementName then
                            select row i
                            set selectedRow to i
                            exit repeat
                        end if
                    end repeat
                    
                    if selectedRow is 0 then
                        -- Close the dialog since we didn't find the arrangement
                        click button "OK" of manageDialog
                        return "Error: Could not find arrangement '" & arrangementName & "' in the management dialog."
                    end if
                end tell
                
                -- Click the - button to delete the selected arrangement
                click button "-" of manageDialog
                delay 0.2
                
                -- Confirm the deletion if a confirmation dialog appears
                try
                    click button "Delete" of sheet 1 of manageDialog
                    delay 0.2
                on error
                    -- No confirmation dialog appeared, which is fine
                end try
                
                -- Close the management dialog
                click button "OK" of manageDialog
                
                return "Deleted window arrangement '" & arrangementName & "'."
            end tell
        end tell
    end tell
end deleteArrangement

-- Helper function to get existing arrangements
on getExistingArrangements()
    set arrangementsPath to (POSIX path of (path to home folder)) & "Library/Application Support/iTerm2/Arrangements"
    
    -- Check if the Arrangements directory exists
    try
        do shell script "test -d " & quoted form of arrangementsPath
    on error
        -- Directory doesn't exist, so no arrangements
        return {}
    end try
    
    -- Get arrangement files from the directory
    set arrangementFiles to paragraphs of (do shell script "ls " & quoted form of arrangementsPath & " | grep '.arrangement'")
    set arrangements to {}
    
    -- Extract arrangement names from filenames
    repeat with arrangementFile in arrangementFiles
        if arrangementFile ends with ".arrangement" then
            set arrangementName to text 1 thru -13 of arrangementFile
            set end of arrangements to arrangementName
        end if
    end repeat
    
    return arrangements
end getExistingArrangements

-- Helper function to convert text to lowercase
on toLowerCase(theText)
    return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLowerCase
