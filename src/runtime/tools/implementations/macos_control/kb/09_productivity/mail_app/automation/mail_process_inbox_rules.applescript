---
id: mail_process_inbox_rules
title: Mail Process Inbox with Rules
description: >-
  Process inbox messages using predefined or custom rules to automatically flag,
  categorize, and organize emails based on sender, subject, or content criteria.
---
-- Mail Process Inbox with Rules
-- Automatically process emails based on rules

on run
	try
		return processInboxWithRules("default")
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set rules to "{rules}"
	
	if rules is "" then
		set rules to "default"
	end if
	
	return processInboxWithRules(rules)
end processMCPParameters

-- Process inbox messages using predefined or custom rules
on processInboxWithRules(ruleSet)
	if ruleSet is missing value then
		set ruleSet to "default"
	end if
	
	-- Load rule definitions
	if ruleSet is "default" then
		set rules to {¬
			{name:"Important", criteria:"from", value:"boss,manager,ceo,urgent", action:"flag", destination:"Important"}, ¬
			{name:"Newsletter", criteria:"subject", value:"newsletter,update,weekly", action:"move", destination:"Newsletters"}, ¬
			{name:"Receipt", criteria:"subject", value:"receipt,order,confirmation,invoice", action:"move", destination:"Receipts"}, ¬
			{name:"Social", criteria:"from", value:"facebook,twitter,instagram,linkedin", action:"move", destination:"Social"}, ¬
			{name:"Unsubscribe", criteria:"subject", value:"unsubscribe", action:"move", destination:"Promotions"} ¬
		}
	else
		-- Parse custom rules if provided
		try
			set rules to ruleSet
		on error
			set rules to {}
		end try
	end if
	
	tell application "Mail"
		set processedCount to 0
		set inboxMessages to messages of inbox
		set messageCount to count of inboxMessages
		
		-- Process each message with the rules
		repeat with i from 1 to messageCount
			set theMessage to item i of inboxMessages
			
			repeat with theRule in rules
				set ruleName to name of theRule
				set ruleCriteria to criteria of theRule
				set ruleValue to value of theRule
				set ruleAction to action of theRule
				set ruleDestination to destination of theRule
				
				set valueList to my splitString(ruleValue, ",")
				set matchFound to false
				
				-- Check if message matches criteria
				if ruleCriteria is "from" then
					set messageSender to sender of theMessage
					repeat with valueItem in valueList
						if messageSender contains valueItem then
							set matchFound to true
							exit repeat
						end if
					end repeat
				else if ruleCriteria is "subject" then
					set messageSubject to subject of theMessage
					repeat with valueItem in valueList
						if messageSubject contains valueItem then
							set matchFound to true
							exit repeat
						end if
					end repeat
				else if ruleCriteria is "content" then
					set messageContent to content of theMessage
					repeat with valueItem in valueList
						if messageContent contains valueItem then
							set matchFound to true
							exit repeat
						end if
					end repeat
				end if
				
				-- Apply the rule action if criteria matched
				if matchFound then
					if ruleAction is "flag" then
						set flag index of theMessage to 1
						set read status of theMessage to true
						set processedCount to processedCount + 1
					else if ruleAction is "move" then
						try
							-- Check if destination mailbox exists, create if needed
							try
								set targetMailbox to mailbox ruleDestination
							on error
								make new mailbox with properties {name:ruleDestination}
								set targetMailbox to mailbox ruleDestination
							end try
							
							-- Move the message
							move theMessage to targetMailbox
							set processedCount to processedCount + 1
						on error errMsg
							log "Error moving message: " & errMsg
						end try
					end if
					
					-- Once a rule is applied, move to next message
					exit repeat
				end if
			end repeat
		end repeat
		
		return {success:true, message:"Processed " & processedCount & " messages with rules", result:processedCount}
	end tell
end processInboxWithRules

-- Utility function to split string by delimiter
on splitString(theString, theDelimiter)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to theDelimiter
	set theArray to every text item of theString
	set AppleScript's text item delimiters to oldDelimiters
	return theArray
end splitString
