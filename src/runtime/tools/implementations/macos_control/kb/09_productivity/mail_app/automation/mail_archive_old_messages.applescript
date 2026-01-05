---
id: mail_archive_old_messages
title: Mail Archive Old Messages
description: >-
  Archive messages older than a specified number of days to designated folders,
  helping to keep mailboxes clean and organized while preserving old emails.
---
-- Mail Archive Old Messages
-- Clean up old emails by archiving them

on run
	try
		-- Default: archive messages older than 30 days
		return archiveOldMessages(30, missing value)
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set archiveDays to "{archiveDays}"
	set archiveDestination to "{archiveDestination}"
	
	if archiveDays is "" then
		set archiveDays to 30
	else
		try
			set archiveDays to archiveDays as number
		on error
			set archiveDays to 30
		end try
	end if
	
	if archiveDestination is "" then
		set archiveDestination to missing value
	end if
	
	return archiveOldMessages(archiveDays, archiveDestination)
end processMCPParameters

-- Archive old messages
on archiveOldMessages(days, destination)
	if days is missing value then
		set days to 30
	end if
	
	if destination is missing value then
		set destination to "Archive/" & (year of (current date)) as string
	end if
	
	tell application "Mail"
		try
			-- Create archive folder if needed
			try
				set targetMailbox to mailbox destination
			on error
				make new mailbox with properties {name:destination}
				set targetMailbox to mailbox destination
			end try
			
			set cutoffDate to (current date) - (days * days)
			set archivedCount to 0
			
			-- Process each mailbox except the Archive
			set mailboxesToProcess to {}
			set allMailboxes to every mailbox
			repeat with mb in allMailboxes
				if name of mb does not start with "Archive" and name of mb is not destination then
					set end of mailboxesToProcess to mb
				end if
			end repeat
			
			-- Archive old messages
			repeat with mb in mailboxesToProcess
				set oldMessages to (messages of mb whose date received < cutoffDate)
				repeat with theMessage in oldMessages
					try
						move theMessage to targetMailbox
						set archivedCount to archivedCount + 1
					on error
						-- Skip messages that can't be moved
					end try
				end repeat
			end repeat
			
			return {success:true, message:"Archived " & archivedCount & " messages older than " & days & " days to " & destination}
		on error errMsg
			return {success:false, error:"Error archiving messages: " & errMsg}
		end try
	end tell
end archiveOldMessages
