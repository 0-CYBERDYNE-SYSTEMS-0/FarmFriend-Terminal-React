---
id: messages_send_message
title: Messages: Send Message
description: Sends a text message to a specified recipient using the Messages app.
---
on run {recipient, messageText}
  tell application "Messages"
    try
      if recipient is "" or recipient is missing value then
        set recipient to "{recipient}"
      end if
      
      if messageText is "" or messageText is missing value then
        set messageText to "{messageText}"
      end if
      
      set targetService to 1st service whose service type = iMessage
      set targetBuddy to buddy recipient of targetService
      
      send messageText to targetBuddy
      
      return "Message sent successfully to " & recipient
      
    on error errMsg number errNum
      if errNum is -1728 then
        -- Try an alternative approach for non-iMessage contacts
        try
          set targetChat to chat recipient
          send messageText to targetChat
          return "Message sent successfully to " & recipient
        on error errMsg2 number errNum2
          return "Error (" & errNum2 & "): Failed to send message - " & errMsg2
        end try
      else
        return "Error (" & errNum & "): Failed to send message - " & errMsg
      end if
    end try
  end tell
end run
