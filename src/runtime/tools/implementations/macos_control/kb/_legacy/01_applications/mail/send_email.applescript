---
id: mail/send_email
title: Send Email via Mail.app
description: Creates and sends an email (requires Mail.app to be configured)
params: to, subject, body
---
tell application "Mail"
	activate
	set newMessage to make new outgoing message with properties {subject:"{subject}", content:"{body}", visible:true}
	tell newMessage
		make new to recipient with properties {address:"{to}"}
	end tell
	send newMessage
	return "Email sent to {to}"
end tell
