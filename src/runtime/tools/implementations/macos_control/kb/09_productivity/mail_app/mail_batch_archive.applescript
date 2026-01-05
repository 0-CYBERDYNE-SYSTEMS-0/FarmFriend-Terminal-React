---
id: mail_batch_archive
title: Mail: Batch Archive Old Messages
description: >-
  Automatically archives messages older than a specified number of days from
  your inbox
---
{daysThreshold}
{accountName}
{archiveMailbox}

on setDefaults(thresholdInput, accountInput, archiveInput)
  set defaults to {threshold:30, account:"", archive:"Archive"}
  
  -- Set days threshold
  if thresholdInput is not missing value and thresholdInput is not "" then
    try
      set defaults's threshold to thresholdInput as number
    end try
  end if
  
  -- Set account name
  if accountInput is not missing value and accountInput is not "" then
    set defaults's account to accountInput
  end if
  
  -- Set archive mailbox name
  if archiveInput is not missing value and archiveInput is not "" then
    set defaults's archive to archiveInput
  end if
  
  return defaults
end setDefaults

on batchArchiveMessages(thresholdInput, accountInput, archiveInput)
  -- Get default values
  set params to my setDefaults(thresholdInput, accountInput, archiveInput)
  set daysThreshold to threshold of params
  set accountName to account of params
  set archiveName to archive of params
  
  tell application "Mail"
    try
      set currentDate to current date
      set cutoffDate to currentDate - (daysThreshold * days)
      set totalArchived to 0
      set affectedAccounts to {}
      
      -- Handle account selection
      if accountName is "" then
        -- Process all accounts
        set accountsToProcess to every account
      else
        -- Process specific account
        try
          set specificAccount to account accountName
          set accountsToProcess to {specificAccount}
        on error
          return "Error: Account '" & accountName & "' not found."
        end try
      end if
      
      -- Process each account
      repeat with acct in accountsToProcess
        set acctName to name of acct
        set acctArchived to 0
        
        -- Skip special accounts
        if acctName is "On My Mac" then
          continue
        end if
        
        -- Find inbox mailbox
        try
          set inboxMailbox to mailbox "INBOX" of acct
        on error
          -- Skip accounts without inbox
          continue
        end try
        
        -- Find archive mailbox
        set archiveMailbox to missing value
        try
          set archiveMailbox to mailbox archiveName of acct
        on error
          -- Try to find a mailbox with "Archive" in the name
          repeat with aBox in every mailbox of acct
            if name of aBox contains "Archive" then
              set archiveMailbox to aBox
              exit repeat
            end if
          end repeat
          
          -- If still no archive found, skip this account
          if archiveMailbox is missing value then
            continue
          end if
        end try
        
        -- Get all inbox messages
        set inboxMessages to messages of inboxMailbox
        
        -- Process messages
        repeat with msg in inboxMessages
          try
            set msgDate to date received of msg
            
            -- Check if message is old enough to archive
            if msgDate < cutoffDate then
              -- Optionally check for flags and unread status (modify as needed)
              set isFlagged to flagged status of msg
              set isUnread to read status of msg is false
              
              -- Skip flagged or unread messages (comment out to include them)
              if isFlagged or isUnread then
                continue
              end if
              
              -- Move to archive
              set mailbox of msg to archiveMailbox
              set acctArchived to acctArchived + 1
              set totalArchived to totalArchived + 1
            end if
          on error
            -- Skip problematic messages
            continue
          end try
        end repeat
        
        -- Record account results if any messages were archived
        if acctArchived > 0 then
          copy {name:acctName, count:acctArchived} to end of affectedAccounts
        end if
      end repeat
      
      -- Format results
      if totalArchived = 0 then
        return "No messages older than " & daysThreshold & " days were found to archive."
      else
        set resultText to "Batch Archive Complete:" & return
        set resultText to resultText & "• Archived " & totalArchived & " message"
        if totalArchived ≠ 1 then set resultText to resultText & "s"
        set resultText to resultText & " older than " & daysThreshold & " days" & return
        set resultText to resultText & "• Target Archive: " & archiveName & return & return
        
        -- Add account breakdown
        set resultText to resultText & "Messages archived by account:" & return
        repeat with acctInfo in affectedAccounts
          set resultText to resultText & "• " & name of acctInfo & ": " & count of acctInfo & return
        end repeat
        
        set resultText to resultText & return & "Note: Flagged and unread messages were preserved in the inbox."
        
        return resultText
      end if
    on error errMsg
      return "Error during batch archive: " & errMsg
    end try
  end tell
end batchArchiveMessages

return my batchArchiveMessages("{daysThreshold}", "{accountName}", "{archiveMailbox}")
