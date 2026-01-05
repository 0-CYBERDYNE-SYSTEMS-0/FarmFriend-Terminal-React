---
id: notes/append_to_note
title: Append to Most Recent Note
description: Appends text to the most recently modified note
params: text
---
tell application "Notes"
	activate
	set theNote to note 1
	set body of theNote to (body of theNote) & linefeed & "{text}"
	return "Text appended to: " & name of theNote
end tell
