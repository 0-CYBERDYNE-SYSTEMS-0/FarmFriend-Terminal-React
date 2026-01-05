---
id: keychain_lock_unlock
title: Keychain Access: Lock and Unlock Keychains
description: >-
  Lock and unlock macOS keychains programmatically using the security
  command-line tool.
---
{keychainPath}
{keychainPassword}
{action}

on manageKeychain(keychainPath, keychainPassword, action)
  -- Validate inputs
  if keychainPath is missing value or keychainPath is "" then
    -- Default to login keychain if no path provided
    set keychainPath to "~/Library/Keychains/login.keychain-db"
  end if
  
  -- Expand ~ if present in the path
  if keychainPath starts with "~" then
    set userHome to POSIX path of (path to home folder)
    set keychainPath to userHome & text 2 thru -1 of keychainPath
  end if
  
  -- Get actual action if missing - default to status check
  if action is missing value or action is "" then
    set action to "status"
  end if
  
  try
    -- Perform the requested action
    if action is "lock" then
      -- Lock the keychain
      set lockCmd to "security lock-keychain " & quoted form of keychainPath
      do shell script lockCmd
      return "Successfully locked keychain: " & keychainPath
      
    else if action is "unlock" then
      -- Validate password for unlock
      if keychainPassword is missing value or keychainPassword is "" then
        return "error: Password is required to unlock a keychain."
      end if
      
      -- Unlock the keychain
      -- Pass the password via stdin to avoid exposing it in process listings
      set unlockCmd to "security unlock-keychain -p stdin " & quoted form of keychainPath
      do shell script unlockCmd & " << EOF
" & keychainPassword & "
EOF"
      
      return "Successfully unlocked keychain: " & keychainPath
      
    else if action is "status" then
      -- Check if keychain exists
      set checkCmd to "test -f " & quoted form of keychainPath & " && echo 'exists' || echo 'not exists'"
      set existsResult to do shell script checkCmd
      
      if existsResult is "not exists" then
        return "Keychain not found at: " & keychainPath
      end if
      
      -- Check lock status
      set statusCmd to "security show-keychain-info " & quoted form of keychainPath & " 2>&1 || echo 'locked'"
      set statusResult to do shell script statusCmd
      
      if statusResult contains "locked" then
        return "Keychain status: LOCKED - " & keychainPath
      else
        return "Keychain status: UNLOCKED - " & keychainPath & return & statusResult
      end if
    else
      return "error: Invalid action. Use 'lock', 'unlock', or 'status'."
    end if
    
  on error errMsg
    return "Error managing keychain: " & errMsg
  end try
end manageKeychain

-- Example usage with MCP input values
return my manageKeychain("{keychainPath}", "{keychainPassword}", "{action}")
