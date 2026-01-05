---
id: terminal_find_focus_window
title: Terminal: Find and Focus Windows or Tabs
description: >-
  Searches for Terminal.app windows or tabs by title, command, or process, then
  brings the matching window to the front.
---
on runWithInput(inputData, legacyArguments)
    set defaultSearchType to "title"
    set defaultSearchTerm to ""
    set defaultPartialMatch to true
    
    -- Parse input parameters
    set searchType to defaultSearchType
    set searchTerm to defaultSearchTerm
    set partialMatch to defaultPartialMatch
    
    if inputData is not missing value then
        if inputData contains {searchType:""} then
            set searchType to searchType of inputData
            {searchType}
        end if
        if inputData contains {searchTerm:""} then
            set searchTerm to searchTerm of inputData
            {searchTerm}
        end if
        if inputData contains {partialMatch:""} then
            try
                set partialMatch to partialMatch of inputData as boolean
                {partialMatch}
            on error
                -- If not a valid boolean, keep default
            end try
        end if
    end if
    
    if searchTerm is "" then
        return "Error: searchTerm not provided. Please specify what to search for."
    end if
    
    -- Normalize search type to lowercase
    set searchType to my toLower(searchType)
    
    tell application "Terminal"
        set windowCount to count of windows
        if windowCount is 0 then
            return "No Terminal windows are open."
        end if
        
        -- Variables to track our findings
        set foundWindows to {}
        set foundTabs to {}
        set foundIndices to {}
        
        -- Search through all windows and tabs
        repeat with i from 1 to windowCount
            set currentWindow to window i
            
            -- Get all tabs in the current window
            set tabCount to count of tabs in currentWindow
            
            repeat with j from 1 to tabCount
                set currentTab to tab j of currentWindow
                set isMatch to false
                
                -- Search based on different criteria
                if searchType is "title" then
                    -- Search in the window's title
                    set windowTitle to custom title of currentWindow
                    if windowTitle is missing value then
                        set windowTitle to name of currentWindow
                    end if
                    set isMatch to matchesSearchTerm(windowTitle, searchTerm, partialMatch)
                    
                else if searchType is "command" then
                    -- Search in the current command
                    try
                        set tabCommand to history of currentTab
                        set lastCommandIndex to my getLastCommandIndex(tabCommand)
                        if lastCommandIndex > 0 then
                            set lastCommand to paragraph lastCommandIndex of tabCommand
                            set isMatch to matchesSearchTerm(lastCommand, searchTerm, partialMatch)
                        end if
                    on error
                        -- If we can't get the command, just continue
                    end try
                    
                else if searchType is "process" then
                    -- Search by process name
                    try
                        set tabProcesses to processes of currentTab
                        if tabProcesses is not {} then
                            set processNames to {}
                            repeat with proc in tabProcesses
                                set end of processNames to name of proc
                            end repeat
                            
                            -- Check if any process matches
                            repeat with procName in processNames
                                if matchesSearchTerm(procName, searchTerm, partialMatch) then
                                    set isMatch to true
                                    exit repeat
                                end if
                            end repeat
                        end if
                    on error
                        -- If we can't get processes, just continue
                    end try
                else
                    return "Error: Invalid searchType. Use 'title', 'command', or 'process'."
                end if
                
                -- If we found a match, record it
                if isMatch then
                    set end of foundWindows to currentWindow
                    set end of foundTabs to currentTab
                    set end of foundIndices to {i, j}
                end if
            end repeat
        end repeat
        
        -- Process the results
        set foundCount to count of foundWindows
        if foundCount is 0 then
            return "No matching Terminal windows or tabs found for " & searchType & ": '" & searchTerm & "'."
        else
            -- Activate the first matching window and tab
            set targetWindow to item 1 of foundWindows
            set targetTab to item 1 of foundTabs
            set {winIndex, tabIndex} to item 1 of foundIndices
            
            -- Activate Terminal app
            activate
            
            -- Set the window to front
            set frontmost of targetWindow to true
            
            -- Select the specific tab
            set selected of targetTab to true
            
            -- Format and return the results
            if foundCount is 1 then
                return "Found and focused 1 matching tab (Window " & winIndex & ", Tab " & tabIndex & ")."
            else
                set foundMessage to "Found " & foundCount & " matching tabs. Focused Window " & winIndex & ", Tab " & tabIndex & "."
                set foundMessage to foundMessage & " Other matches: "
                
                repeat with i from 2 to foundCount
                    set {winIndex, tabIndex} to item i of foundIndices
                    set foundMessage to foundMessage & "Window " & winIndex & ", Tab " & tabIndex
                    if i < foundCount then
                        set foundMessage to foundMessage & "; "
                    end if
                end repeat
                
                return foundMessage
            end if
        end if
    end tell
end runWithInput

-- Helper function to get the last command from history text
on getLastCommandIndex(historyText)
    set theLines to paragraphs of historyText
    set lineCount to count of theLines
    
    -- Start from the end and find a non-empty line
    if lineCount > 0 then
        repeat with i from lineCount to 1 by -1
            set currentLine to item i of theLines
            if currentLine is not "" then
                return i
            end if
        end repeat
    end if
    
    return 0
end getLastCommandIndex

-- Helper function to check if text matches search term
on matchesSearchTerm(textToCheck, searchTerm, partialMatch)
    if textToCheck is missing value or textToCheck is "" then
        return false
    end if
    
    set lowercaseText to my toLower(textToCheck)
    set lowercaseSearch to my toLower(searchTerm)
    
    if partialMatch then
        return lowercaseText contains lowercaseSearch
    else
        return lowercaseText is equal to lowercaseSearch
    end if
end matchesSearchTerm

-- Helper function to convert text to lowercase
on toLower(theText)
    return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLower
