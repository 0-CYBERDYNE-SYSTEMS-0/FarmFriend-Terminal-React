---
id: mail_search_organization
title: Mail Search and Organization
description: Functions for searching and organizing emails in Apple Mail
---
-- Search emails with criteria
on searchEmails(searchCriteria)
  tell application "Mail"
    try
      set searchResults to {}
      
      -- Get the account to search in
      set accountToSearch to missing value
      if searchCriteria's account is not "" then
        set accountToSearch to account searchCriteria's account
      end if
      
      -- Get the mailbox to search in
      set mailboxToSearch to missing value
      if searchCriteria's folder is not "" and accountToSearch is not missing value then
        set mailboxToSearch to mailbox searchCriteria's folder of accountToSearch
      end if
      
      -- Build the search string
      set searchString to ""
      
      if searchCriteria's subject is not "" then
        set searchString to searchString & " subject:" & quoted form of searchCriteria's subject
      end if
      
      if searchCriteria's sender is not "" then
        set searchString to searchString & " from:" & quoted form of searchCriteria's sender
      end if
      
      if searchCriteria's recipient is not "" then
        set searchString to searchString & " to:" & quoted form of searchCriteria's recipient
      end if
      
      if searchCriteria's content is not "" then
        set searchString to searchString & " content:" & quoted form of searchCriteria's content
      end if
      
      -- Perform the search
      if mailboxToSearch is not missing value then
        -- Search in specific mailbox
        set foundMessages to search mailboxToSearch for searchString
      else if accountToSearch is not missing value then
        -- Search in all mailboxes of the account
        set foundMessages to search accountToSearch for searchString
      else
        -- Search in all accounts
        set foundMessages to search for searchString
      end if
      
      -- Filter by date if specified
      if searchCriteria's dateSince is not "" then
        try
          set dateThreshold to date searchCriteria's dateSince
          set filteredMessages to {}
          
          repeat with aMessage in foundMessages
            if date received of aMessage ≥ dateThreshold then
              set end of filteredMessages to aMessage
            end if
          end repeat
          
          set foundMessages to filteredMessages
        end try
      end if
      
      -- Limit results if specified
      if searchCriteria's maxResults is not "" and searchCriteria's maxResults is not 0 then
        set maxCount to searchCriteria's maxResults as integer
        if (count of foundMessages) > maxCount then
          set foundMessages to items 1 thru maxCount of foundMessages
        end if
      end if
      
      -- Extract information from found messages
      repeat with aMessage in foundMessages
        set messageSubject to subject of aMessage
        set messageSender to sender of aMessage
        set messageDate to date received of aMessage
        
        set messageInfo to {subject:messageSubject, sender:messageSender, date:messageDate}
        set end of searchResults to messageInfo
      end repeat
      
      logMessage("Search completed, found " & (count of searchResults) & " messages")
      return searchResults
    on error errMsg
      logMessage("Error during search: " & errMsg)
      return {}
    end try
  end tell
end searchEmails
