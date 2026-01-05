---
id: finder/new_folder
title: Create New Folder in Finder
description: Creates a new folder with the given name in the current Finder window location
params: folder_name
---
tell application "Finder"
	activate
	try
		set targetFolder to target of front window as alias
	on error
		set targetFolder to (path to desktop) as alias
	end try
	make new folder at targetFolder with properties {name:"{folder_name}"}
	return "Created folder: {folder_name}"
end tell
