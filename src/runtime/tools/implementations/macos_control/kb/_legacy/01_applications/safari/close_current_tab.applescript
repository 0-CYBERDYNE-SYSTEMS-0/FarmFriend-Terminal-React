---
id: safari/close_current_tab
title: Close Current Safari Tab
description: Closes the currently active tab in Safari
---
tell application "Safari"
	if (count of windows) > 0 then
		close current tab of front window
		return "Tab closed"
	else
		return "No Safari windows open"
	end if
end tell
