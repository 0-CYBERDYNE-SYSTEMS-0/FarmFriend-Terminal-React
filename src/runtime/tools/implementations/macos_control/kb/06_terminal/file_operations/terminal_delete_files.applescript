---
id: terminal_delete_files
title: Terminal Delete Files
description: >-
  Safely delete files or directories through the terminal with confirmation
  prompts and special warnings for non-empty directories.
---
-- Terminal Delete Files
-- Safely delete files or directories

on run
	try
		-- Default values for interactive mode
		set defaultSource to ""
		
		return deleteFiles(defaultSource)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set theSource to "{source}"
	
	-- Validate parameters
	if theSource is "" then
		return "Error: Source path is required for delete operation."
	end if
	
	return deleteFiles(theSource)
end processMCPParameters

-- Function to delete files or directories
on deleteFiles(sourcePath)
	-- Check if source exists
	set sourceExists to do shell script "[ -e " & quoted form of sourcePath & " ] && echo 'exists' || echo 'not exists'"
	
	if sourceExists is "not exists" then
		return "Error: Path does not exist: " & sourcePath
	end if
	
	-- Check if source is a file or directory
	set sourceType to do shell script "[ -d " & quoted form of sourcePath & " ] && echo 'directory' || echo 'file'"
	
	-- Ask for confirmation before deleting
	set confirmMessage to "Are you sure you want to delete this " & sourceType & "?"
	set confirmButton to "Delete"
	
	if sourceType is "directory" then
		-- Check if directory is empty
		set dirEmpty to do shell script "[ \"$(ls -A " & quoted form of sourcePath & ")\" ] && echo 'not empty' || echo 'empty'"
		
		if dirEmpty is "not empty" then
			set confirmMessage to "Warning: The directory is not empty. Are you sure you want to delete it and all its contents?"
			set confirmButton to "Delete All"
		end if
	end if
	
	display dialog confirmMessage buttons {"Cancel", confirmButton} default button "Cancel" with icon caution
	
	-- Construct the appropriate rm command
	set rmCommand to "rm "
	
	if sourceType is "directory" then
		set rmCommand to rmCommand & "-rf " -- Recursive and force for directories
	else
		set rmCommand to rmCommand & "-f " -- Force for files
	end if
	
	-- Add source path
	set rmCommand to rmCommand & quoted form of sourcePath
	
	-- Execute the command
	try
		do shell script rmCommand
		
		if sourceType is "directory" then
			return "Successfully deleted directory: " & sourcePath
		else
			return "Successfully deleted file: " & sourcePath
		end if
	on error errMsg
		return "Error deleting: " & errMsg
	end try
end deleteFiles
