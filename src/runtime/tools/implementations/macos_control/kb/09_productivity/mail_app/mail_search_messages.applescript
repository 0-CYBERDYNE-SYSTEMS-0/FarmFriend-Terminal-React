---
id: mail_search_messages
title: Mail: Search for Messages
description: >-
  Searches for emails matching specified criteria like subject, sender, or
  content
---
{searchTerm}
{searchType}
{mailboxName}

-- Set default search parameters if not provided
on setDefaults(term, searchIn, boxName)
  set defaults to {term:term, searchIn:searchIn, boxName:boxName}
  
  -- Validate search term
  if term is missing value or term is "" then
    error "Search term is required"
  end if
  
  -- Set default search type
  if searchIn is missing value or searchIn is "" then
    set defaults's searchIn to "subject"
  else
    -- Normalize the search type
    set searchType to lowercase of searchIn
    if searchType is "from" then set searchType to "sender"
    if searchType is "body" then set searchType to "content"
    
    -- Verify valid search type
    if searchType is not in {"subject", "sender", "content"} then
      error "Invalid search type. Use 'subject', 'sender', or 'content'"
    end if
    set defaults's searchIn to searchType
  end if
  
  -- Set default mailbox
  if boxName is missing value or boxName is "" then
    set defaults's boxName to "INBOX"
  end if
  
  return defaults
end setDefaults

-- Format date for output
on formatDate(mailDate)
  set {year:y, month:m, day:d, hours:h, minutes:min} to mailDate
  set monthNames to {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
  set monthName to item m of monthNames
  
  return monthName & " " & d & ", " & y & " " & h & ":" & text -2 thru -1 of ("0" & min)
end formatDate

-- Main search function
on searchMessages(term, searchType, mailboxName)
  try
    -- Validate and set defaults
    set searchParams to my setDefaults(term, searchType, mailboxName)
    set searchTerm to searchParams's term
    set searchIn to searchParams's searchIn
    set targetMailbox to searchParams's boxName
    
    tell application "Mail"
      set matchingMessages to {}
      set matchCount to 0
      set maxResults to 10 -- Limit results to avoid overflow
      
      -- Search across all accounts
      set allAccounts to every account
      repeat with thisAccount in allAccounts
        try
          set accountName to name of thisAccount
          
          -- Find the specified mailbox in this account
          set mailboxFound to false
          repeat with aMailbox in (every mailbox of thisAccount)
            if name of aMailbox is targetMailbox then
              set mailboxFound to true
              
              -- Search through messages in this mailbox
              set mailMessages to messages of aMailbox
              repeat with thisMessage in mailMessages
                set isMatch to false
                
                -- Apply the appropriate search criteria
                if searchIn is "subject" then
                  if (subject of thisMessage contains searchTerm) then
                    set isMatch to true
                  end if
                else if searchIn is "sender" then
                  if (sender of thisMessage contains searchTerm) then
                    set isMatch to true
                  end if
                else if searchIn is "content" then
                  if (content of thisMessage contains searchTerm) then
                    set isMatch to true
                  end if
                end if
                
                -- If matching message found, add to results
                if isMatch then
                  set msgSubject to subject of thisMessage
                  set msgDate to my formatDate(date received of thisMessage)
                  set msgSender to sender of thisMessage
                  
                  copy {subject:msgSubject, date:msgDate, sender:msgSender, account:accountName} to end of matchingMessages
                  set matchCount to matchCount + 1
                  
                  -- If we reached max results, exit early
                  if matchCount ≥ maxResults then exit repeat
                end if
              end repeat
              
              -- If max results reached, break out of mailbox loop
              if matchCount ≥ maxResults then exit repeat
            end if
          end repeat
          
          -- If max results reached, break out of account loop
          if matchCount ≥ maxResults then exit repeat
        on error
          -- Skip this account if there's an error
        end try
      end repeat
      
      -- Format and return results
      if matchCount is 0 then
        return "No messages found matching '" & searchTerm & "' in " & searchIn & " field"
      else
        set resultText to "Found " & matchCount & " message"
        if matchCount ≠ 1 then set resultText to resultText & "s"
        set resultText to resultText & " matching '" & searchTerm & "' in " & searchIn & " field:" & return & return
        
        repeat with i from 1 to count of matchingMessages
          set msgData to item i of matchingMessages
          set resultText to resultText & "Subject: " & msgData's subject & return
          set resultText to resultText & "From: " & msgData's sender & return
          set resultText to resultText & "Date: " & msgData's date & return
          set resultText to resultText & "Account: " & msgData's account & return & return
        end repeat
        
        if matchCount ≥ maxResults then
          set resultText to resultText & "(Showing first " & maxResults & " results)"
        end if
        
        return resultText
      end if
    end tell
  on error errMsg
    return "Error searching messages: " & errMsg
  end try
end searchMessages

return my searchMessages("{searchTerm}", "{searchType}", "{mailboxName}")
