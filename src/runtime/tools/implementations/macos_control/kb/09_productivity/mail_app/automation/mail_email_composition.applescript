---
id: mail_email_composition
title: Mail Email Composition and Sending
description: Functions for creating and sending emails with Apple Mail automation
---
-- Create and send a new email
on sendEmail(recipientEmail, emailSubject, emailBody, ccRecipients, bccRecipients, attachmentPath, accountName, signatureName)
  tell application "Mail"
    -- Create a new outgoing message
    set newMessage to make new outgoing message
    
    -- Set the subject
    set subject of newMessage to emailSubject
    
    -- Set the content
    set content of newMessage to emailBody
    
    -- Set the recipient
    tell newMessage
      make new to recipient with properties {address:recipientEmail}
      
      -- Add CC recipients if provided
      if ccRecipients is not {} then
        repeat with ccEmail in ccRecipients
          make new cc recipient with properties {address:ccEmail}
        end repeat
      end if
      
      -- Add BCC recipients if provided
      if bccRecipients is not {} then
        repeat with bccEmail in bccRecipients
          make new bcc recipient with properties {address:bccEmail}
        end repeat
      end if
      
      -- Add attachment if provided
      if attachmentPath is not "" then
        try
          -- Convert to POSIX path if needed
          if attachmentPath starts with "~" then
            set attachmentPath to do shell script "echo " & quoted form of attachmentPath
          end if
          
          -- Check if file exists
          set fileExists to do shell script "test -f " & quoted form of attachmentPath & " && echo 'yes' || echo 'no'"
          
          if fileExists is "yes" then
            tell content
              make new attachment with properties {file name:attachmentPath} at after the last paragraph
            end tell
          end if
        on error errMsg
          logMessage("Error adding attachment: " & errMsg)
        end try
      end if
    end tell
    
    -- Set account if specified
    if accountName is not "" then
      try
        set sender of newMessage to accountName
      on error errMsg
        logMessage("Error setting sender account: " & errMsg)
      end try
    end if
    
    -- Set signature if specified
    if signatureName is not "" then
      try
        set message signature of newMessage to signature signatureName
      on error errMsg
        logMessage("Error setting signature: " & errMsg)
      end try
    end if
    
    -- Send the email
    try
      send newMessage
      logMessage("Email sent to " & recipientEmail & " with subject '" & emailSubject & "'")
      return "Email sent successfully to " & recipientEmail
    on error errMsg
      logMessage("Error sending email: " & errMsg)
      return "Error sending email: " & errMsg
    end try
  end tell
end sendEmail
