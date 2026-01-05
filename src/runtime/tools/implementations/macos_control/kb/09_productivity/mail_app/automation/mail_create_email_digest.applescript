---
id: mail_create_email_digest
title: Mail Create Email Digest
description: >-
  Create a digest of recent messages from a specified time period, compiling
  message summaries into a single email for quick review.
---
-- Mail Create Email Digest
-- Compile recent messages into a digest

on run
	try
		-- Default: digest messages from the past day
		return createEmailDigest(1, "")
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set digestDays to "{digestDays}"
	set digestFolder to "{digestFolder}"
	
	if digestDays is "" then
		set digestDays to 1
	else
		try
			set digestDays to digestDays as number
		on error
			set digestDays to 1
		end try
	end if
	
	return createEmailDigest(digestDays, digestFolder)
end processMCPParameters

-- Create a digest of recent messages
on createEmailDigest(days, folder)
	if days is missing value then
		set days to 1
	end if
	
	if folder is missing value then
		set folder to ""
	end if
	
	tell application "Mail"
		try
			set digestContent to "Email Digest - " & ((current date) as string) & "

Messages from the past " & days & " day(s):
-------------------------------------------------
"
			
			set cutoffDate to (current date) - (days * days)
			set messagesToInclude to {}
			
			-- Get messages from specified folder or all inboxes
			if folder is "" then
				set messagesToInclude to messages of inbox whose date received > cutoffDate
			else
				try
					set targetMailbox to mailbox folder
					set messagesToInclude to messages of targetMailbox whose date received > cutoffDate
				on error
					set messagesToInclude to messages of inbox whose date received > cutoffDate
				end try
			end if
			
			set messageCount to count of messagesToInclude
			
			-- Create the digest content
			repeat with i from 1 to messageCount
				set theMessage to item i of messagesToInclude
				set messageDate to date received of theMessage
				set messageSender to sender of theMessage
				set messageSubject to subject of theMessage
				
				set digestContent to digestContent & "
From: " & messageSender & "
Date: " & messageDate & "
Subject: " & messageSubject & "
--------------------
"
			end repeat
			
			set digestContent to digestContent & "
End of digest. Total messages: " & messageCount & "."
			
			-- Create a new email with the digest
			set newMessage to make new outgoing message with properties {subject:"Email Digest - " & ((current date) as string), content:digestContent, visible:true}
			
			return {success:true, message:"Created email digest with " & messageCount & " messages", result:messageCount}
		on error errMsg
			return {success:false, error:"Error creating email digest: " & errMsg}
		end try
	end tell
end createEmailDigest
