---
id: finder/get_current_path
title: Get Current Finder Path
description: Returns the POSIX path of the frontmost Finder window
---
tell application "Finder"
	if (count of windows) > 0 then
		return POSIX path of (target of front window as alias)
	else
		return "No Finder windows open"
	end if
end tell
