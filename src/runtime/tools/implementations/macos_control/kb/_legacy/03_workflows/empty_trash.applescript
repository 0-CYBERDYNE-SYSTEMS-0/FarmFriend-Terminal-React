---
id: workflow/empty_trash
title: Empty Trash
description: Empties the Trash
---
tell application "Finder"
	empty trash
	return "Trash emptied"
end tell
