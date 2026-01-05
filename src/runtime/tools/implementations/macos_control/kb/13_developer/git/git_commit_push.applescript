---
id: git_commit_push
title: Git Commit and Push
description: Message for the commit
---
on run {input, parameters}
    set repoPath to "{repoPath}"
    set commitMessage to "{commitMessage}"
    
    if repoPath is "" or repoPath is missing value then
        tell application "Finder"
            if exists Finder window 1 then
                set currentFolder to target of Finder window 1 as alias
                set repoPath to POSIX path of currentFolder
            else
                display dialog "No Finder window open and no repository path provided." buttons {"OK"} default button "OK" with icon stop
                return
            end if
        end tell
    end if
    
    if commitMessage is "" or commitMessage is missing value then
        set commitMessage to "Update from AppleScript"
    end if
    
    -- Properly escape the commit message for the shell
    set quotedMessage to quoted form of commitMessage
    
    -- Build the command with proper chaining
    set gitCommand to "cd " & quoted form of repoPath & " && git add -A && git commit -m " & quotedMessage & " && git push"
    
    try
        set result to do shell script gitCommand
        return "Successfully committed and pushed changes to repository at " & repoPath & "." & return & return & result
    on error errMsg
        return "Error performing Git operations: " & errMsg
    end try
end run
