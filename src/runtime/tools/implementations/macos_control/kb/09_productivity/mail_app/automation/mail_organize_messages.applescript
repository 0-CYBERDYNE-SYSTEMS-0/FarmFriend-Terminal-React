---
id: mail_organize_messages
title: Mail Organize Messages
description: >-
  Organize messages based on criteria like unread status, flags, sender, or
  subject into designated mailboxes for better email management.
---
-- Mail Organize Messages
-- Sort messages into folders based on criteria

on run
	try
		-- Interactive mode - uses default criteria
		return organizeMessages("unread", "Follow Up")
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set organizeCriteria to "{organizeCriteria}"
	set organizeDestination to "{organizeDestination}"
	
	if organizeCriteria is "" then
		set organizeCriteria to "unread"
	end if
	
	if organizeDestination is "" then
		set organizeDestination to "Follow Up"
	end if
	
	return organizeMessages(organizeCriteria, organizeDestination)
end processMCPParameters

-- Organize messages based on criteria
on organizeMessages(criteria, destination)
	if criteria is missing value then
		set criteria to "unread"
	end if
	
	if destination is missing value then
		set destination to "Follow Up"
	end if
	
	tell application "Mail"
		try
			-- Create the destination mailbox if it doesn't exist
			try
				set targetMailbox to mailbox destination
			on error
				make new mailbox with properties {name:destination}
				set targetMailbox to mailbox destination
			end try
			
			-- Get messages to organize based on criteria
			set messagesToOrganize to {}
			
			if criteria is "unread" then
				set allMailboxes to every mailbox
				repeat with mb in allMailboxes
					set unreadMessages to (messages of mb whose read status is false)
					set messagesToOrganize to messagesToOrganize & unreadMessages
				end repeat
			else if criteria is "flagged" then
				set allMailboxes to every mailbox
				repeat with mb in allMailboxes
					set flaggedMessages to (messages of mb whose flagged status is true)
					set messagesToOrganize to messagesToOrganize & flaggedMessages
				end repeat
			else if criteria contains "from:" then
				set searchTerm to text 6 thru -1 of criteria
				set allMailboxes to every mailbox
				repeat with mb in allMailboxes
					set fromMessages to (messages of mb whose sender contains searchTerm)
					set messagesToOrganize to messagesToOrganize & fromMessages
				end repeat
			else if criteria contains "subject:" then
				set searchTerm to text 9 thru -1 of criteria
				set allMailboxes to every mailbox
				repeat with mb in allMailboxes
					set subjectMessages to (messages of mb whose subject contains searchTerm)
					set messagesToOrganize to messagesToOrganize & subjectMessages
				end repeat
			end if
			
			-- Move messages to destination
			set movedCount to 0
			repeat with theMessage in messagesToOrganize
				try
					move theMessage to targetMailbox
					set movedCount to movedCount + 1
				on error
					-- Skip messages that can't be moved
				end try
			end repeat
			
			return {success:true, message:"Organized " & movedCount & " messages matching criteria '" & criteria & "' to " & destination}
		on error errMsg
			return {success:false, error:"Error organizing messages: " & errMsg}
		end try
	end tell
end organizeMessages
