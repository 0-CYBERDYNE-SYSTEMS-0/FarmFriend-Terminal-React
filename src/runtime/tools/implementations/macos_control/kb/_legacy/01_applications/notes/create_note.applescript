---
id: notes/create_note
title: Create New Note
description: Creates a new note with the given title and body text
params: title, body
---
tell application "Notes"
	activate
	set newNote to make new note with properties {name:"{title}", body:"{body}"}
	return "Note created: {title}"
end tell
