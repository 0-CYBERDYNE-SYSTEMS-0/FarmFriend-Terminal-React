---
id: finder/get_selection
title: Get Finder Selection
description: Returns the paths of all currently selected items in Finder
---
tell application "Finder"
	set selectedItems to selection
	if (count of selectedItems) = 0 then
		return "No items selected"
	else
		set itemPaths to {}
		repeat with anItem in selectedItems
			set end of itemPaths to POSIX path of (anItem as alias)
		end repeat
		return itemPaths as text
	end if
end tell
