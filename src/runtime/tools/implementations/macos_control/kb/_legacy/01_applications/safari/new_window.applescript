---
id: safari/new_window
title: Create New Safari Window
description: Opens a new Safari window with optional URL
params: url
---
tell application "Safari"
	activate
	make new document
	if "{url}" is not "" and "{url}" is not "{url}" then
		set URL of current tab of front window to "{url}"
	end if
end tell
