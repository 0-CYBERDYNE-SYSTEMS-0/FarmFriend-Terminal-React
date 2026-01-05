---
id: finder/open_location
title: Open Location in Finder
description: Opens a specified path in Finder
params: path
---
tell application "Finder"
	activate
	open (POSIX file "{path}")
	return "Opened: {path}"
end tell
