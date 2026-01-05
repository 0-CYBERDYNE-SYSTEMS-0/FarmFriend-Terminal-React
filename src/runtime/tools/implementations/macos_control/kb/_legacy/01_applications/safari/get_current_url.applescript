---
id: safari/get_current_url
title: Get Current Safari URL
description: Returns the URL of the currently active Safari tab
---
tell application "Safari"
	if (count of windows) > 0 then
		return URL of current tab of front window
	else
		return "No Safari windows open"
	end if
end tell
