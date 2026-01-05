---
id: notes/get_note
title: Get Note by Title
description: Returns the body of a note with the specified title
params: title
---
tell application "Notes"
	set foundNotes to notes whose name contains "{title}"
	if (count of foundNotes) > 0 then
		return body of item 1 of foundNotes
	else
		return "Note not found: {title}"
	end if
end tell
