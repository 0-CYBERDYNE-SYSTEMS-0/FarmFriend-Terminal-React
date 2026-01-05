---
id: mail_apply_template_responses
title: Mail Apply Template Responses
description: >-
  Apply predefined email templates to quickly respond to messages with common
  replies like out of office, meeting requests, support confirmations, etc.
---
-- Mail Apply Template Responses
-- Quick email replies using templates

on run
	try
		-- Interactive mode - prompts for template selection
		return applyTemplateResponses(missing value, missing value)
	on error errMsg
		return {success:false, error:errMsg}
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set templateName to "{templateName}"
	set templateRecipient to "{templateRecipient}"
	
	if templateName is "" or templateRecipient is "" then
		return {success:false, error:"Template name and recipient are required"}
	end if
	
	return applyTemplateResponses(templateName, templateRecipient)
end processMCPParameters

-- Apply email templates to quickly respond to messages
on applyTemplateResponses(templateName, recipient)
	set templates to {¬
		{name:"Meeting Request", subject:"Meeting Request Response", content:"Thank you for your meeting request. I am available on [DATE] at [TIME]. Please let me know if this works for you."}, ¬
		{name:"Out of Office", subject:"Out of Office Reply", content:"Thank you for your email. I am currently out of the office until [DATE] with limited access to email. I will respond to your message upon my return."}, ¬
		{name:"Support Request", subject:"Support Request Confirmation", content:"Thank you for contacting support. Your request has been received and assigned ticket number [TICKET]. We'll get back to you within 24 hours."}, ¬
		{name:"Thank You", subject:"Thank You", content:"Thank you for your email. I appreciate your [MESSAGE] and will get back to you as soon as possible."}, ¬
		{name:"Job Application", subject:"Job Application Received", content:"Thank you for applying for the [POSITION] position. We have received your application and will review it shortly. We'll contact you if your qualifications match our needs."} ¬
	}
	
	-- Interactive mode if parameters not provided
	if templateName is missing value or recipient is missing value then
		tell application "Mail"
			-- Get template names
			set templateNames to {}
			repeat with t in templates
				set end of templateNames to name of t
			end repeat
			
			-- Select template
			set selectedTemplate to choose from list templateNames with prompt "Select a response template:"
			if selectedTemplate is false then
				return {success:false, error:"No template selected"}
			end if
			set templateName to item 1 of selectedTemplate
			
			-- Select recipient
			set recipientOptions to {}
			set selectedMessages to selection
			if (count of selectedMessages) > 0 then
				set theMessage to item 1 of selectedMessages
				set end of recipientOptions to sender of theMessage
			end if
			
			set recipientInput to text returned of (display dialog "Enter recipient:" default answer (item 1 of recipientOptions))
			set recipient to recipientInput
		end tell
	end if
	
	-- Find the template
	set templateFound to false
	set templateSubject to ""
	set templateContent to ""
	
	repeat with t in templates
		if name of t is templateName then
			set templateFound to true
			set templateSubject to subject of t
			set templateContent to content of t
			exit repeat
		end if
	end repeat
	
	if not templateFound then
		return {success:false, error:"Template not found: " & templateName}
	end if
	
	-- Create and compose the email
	tell application "Mail"
		set newMessage to make new outgoing message with properties {subject:templateSubject, content:templateContent, visible:true}
		tell newMessage
			make new to recipient at end of to recipients with properties {address:recipient}
		end tell
		
		return {success:true, message:"Template '" & templateName & "' applied to new message for " & recipient}
	end tell
end applyTemplateResponses
