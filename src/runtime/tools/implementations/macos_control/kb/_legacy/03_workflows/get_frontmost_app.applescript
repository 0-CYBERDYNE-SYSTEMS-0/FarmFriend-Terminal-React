---
id: workflow/get_frontmost_app
title: Get Frontmost Application
description: Returns the name of the currently active application
---
tell application "System Events"
	return name of first application process whose frontmost is true
end tell
