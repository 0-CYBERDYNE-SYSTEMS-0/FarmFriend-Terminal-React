---
id: mail_create_quick_message
title: Mail Create Quick Message
description: >-
  Create and compose a quick email message with recipient, subject, and content,
  perfect for rapid email composition without navigating the Mail app interface.
---
-- Mail Create Quick Message
-- Rapid email composition

on run
	try
		-- Interactive mode - prompts for input
		return createQuickMessage(missing value, missing value, missing value)
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set quickRecipient to "{quickRecipient}"
	set quickSubject to "{quickSubject}"
	set quickContent to "{quickContent}"
	
	if quickRecipient is "" then
		return {success:false, error:"Recipient is required for quick message"}
	end if
	
	if quickSubject is "" then
		set quickSubject to "Quick Message"
	end if
	
	return createQuickMessage(quickRecipient, quickSubject, quickContent)
end processMCPParameters

-- Create a quick message
on createQuickMessage(recipient, subject, content)
	-- Interactive mode if parameters not provided
	if recipient is missing value then
		tell application "Mail"
			set recipientInput to text returned of (display dialog "Enter recipient:" default answer "")
			set recipient to recipientInput
			
			set subjectInput to text returned of (display dialog "Enter subject:" default answer "Quick Message")
			set subject to subjectInput
			
			set contentInput to text returned of (display dialog "Enter message content:" default answer "" with icon note)
			set content to contentInput
		end tell
	end if
	
	if subject is missing value or subject is "" then
		set subject to "Quick Message"
	end if
	
	if content is missing value then
		set content to ""
	end if
	
	tell application "Mail"
		set newMessage to make new outgoing message with properties {subject:subject, content:content, visible:true}
		tell newMessage
			make new to recipient at end of to recipients with properties {address:recipient}
		end tell
		
		return {success:true, message:"Created quick message to " & recipient}
	end tell
end createQuickMessage
