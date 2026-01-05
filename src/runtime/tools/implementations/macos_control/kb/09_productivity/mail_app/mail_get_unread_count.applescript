---
id: mail_get_unread_count
title: Mail: Get Unread Message Count
description: >-
  Retrieves the unread message count from specified mailboxes across mail
  accounts
---
{mailboxName}

-- Set default mailbox if not provided
on setDefaultMailbox(mailboxInput)
  if mailboxInput is missing value or mailboxInput is "" then
    return "INBOX"
  else
    return mailboxInput
  end if
end setDefaultMailbox

-- Main function to get unread count
on getUnreadCount(targetMailboxName)
  set mailboxToCheck to my setDefaultMailbox(targetMailboxName)
  
  tell application "Mail"
    try
      set allAccounts to every account
      set totalUnread to 0
      set accountCounts to {}
      
      -- Check each account
      repeat with thisAccount in allAccounts
        set accountName to name of thisAccount
        set accountUnread to 0
        
        try
          set accountMailboxes to every mailbox of thisAccount
          repeat with aMailbox in accountMailboxes
            if name of aMailbox is mailboxToCheck then
              set boxUnread to unread count of aMailbox
              set accountUnread to accountUnread + boxUnread
              exit repeat
            end if
          end repeat
          
          -- Add this account's results
          if accountUnread > 0 then
            copy {account:accountName, unread:accountUnread} to end of accountCounts
            set totalUnread to totalUnread + accountUnread
          end if
        on error errMsg
          -- Skip this account if there's an error
        end try
      end repeat
      
      -- Format the result
      set resultText to "Total unread in " & mailboxToCheck & ": " & totalUnread & " messages"
      
      if (count of accountCounts) > 0 then
        set resultText to resultText & " ("
        repeat with i from 1 to count of accountCounts
          set accountInfo to item i of accountCounts
          set resultText to resultText & accountInfo's account & ": " & accountInfo's unread
          if i < count of accountCounts then
            set resultText to resultText & ", "
          end if
        end repeat
        set resultText to resultText & ")"
      end if
      
      return resultText
    on error errMsg
      return "Error checking unread count: " & errMsg
    end try
  end tell
end getUnreadCount

return my getUnreadCount("{mailboxName}")
