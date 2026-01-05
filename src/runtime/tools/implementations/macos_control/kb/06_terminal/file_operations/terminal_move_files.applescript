---
id: terminal_move_files
title: Terminal Move Files
description: >-
  Move or rename files and directories through the terminal, preserving
  file attributes and handling complex paths with spaces.
---
-- Terminal Move Files
-- Move or rename files and directories

on run
	try
		-- Default values for interactive mode
		set defaultSource to ""
		set defaultDestination to ""
		
		return moveFiles(defaultSource, defaultDestination)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set theSource to "{source}"
	set theDestination to "{destination}"
	
	-- Validate parameters
	if theSource is "" then
		return "Error: Source path is required for move operation."
	end if
	
	if theDestination is "" then
		return "Error: Destination path is required for move operation."
	end if
	
	return moveFiles(theSource, theDestination)
end processMCPParameters

-- Function to move files or directories
on moveFiles(sourcePath, destPath)
	-- Check if source exists
	set sourceExists to do shell script "[ -e " & quoted form of sourcePath & " ] && echo 'exists' || echo 'not exists'"
	
	if sourceExists is "not exists" then
		return "Error: Source path does not exist: " & sourcePath
	end if
	
	-- Check if source is a file or directory
	set sourceType to do shell script "[ -d " & quoted form of sourcePath & " ] && echo 'directory' || echo 'file'"
	
	-- Execute the move command
	try
		do shell script "mv " & quoted form of sourcePath & " " & quoted form of destPath
		
		if sourceType is "directory" then
			return "Successfully moved directory from " & sourcePath & " to " & destPath
		else
			return "Successfully moved file from " & sourcePath & " to " & destPath
		end if
	on error errMsg
		return "Error moving: " & errMsg
	end try
end moveFiles
