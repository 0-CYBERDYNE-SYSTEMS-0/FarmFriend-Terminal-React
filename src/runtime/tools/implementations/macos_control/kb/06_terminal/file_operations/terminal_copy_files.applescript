---
id: terminal_copy_files
title: Terminal Copy Files
description: >-
  Copy files or directories through the terminal, automatically handling
  recursive operations for directories and supporting drag-and-drop paths.
---
-- Terminal Copy Files
-- Copy files or directories

on run
	try
		-- Default values for interactive mode
		set defaultSource to ""
		set defaultDestination to ""
		
		return copyFiles(defaultSource, defaultDestination)
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
		return "Error: Source path is required for copy operation."
	end if
	
	if theDestination is "" then
		return "Error: Destination path is required for copy operation."
	end if
	
	return copyFiles(theSource, theDestination)
end processMCPParameters

-- Function to copy files or directories
on copyFiles(sourcePath, destPath)
	-- Check if source exists
	set sourceExists to do shell script "[ -e " & quoted form of sourcePath & " ] && echo 'exists' || echo 'not exists'"
	
	if sourceExists is "not exists" then
		return "Error: Source path does not exist: " & sourcePath
	end if
	
	-- Check if source is a file or directory
	set sourceType to do shell script "[ -d " & quoted form of sourcePath & " ] && echo 'directory' || echo 'file'"
	
	-- Construct the appropriate cp command
	set cpCommand to "cp "
	
	if sourceType is "directory" then
		set cpCommand to cpCommand & "-R " -- Recursive for directories
	end if
	
	-- Add source and destination
	set cpCommand to cpCommand & quoted form of sourcePath & " " & quoted form of destPath
	
	-- Execute the command
	try
		do shell script cpCommand
		
		if sourceType is "directory" then
			return "Successfully copied directory from " & sourcePath & " to " & destPath
		else
			return "Successfully copied file from " & sourcePath & " to " & destPath
		end if
	on error errMsg
		return "Error copying: " & errMsg
	end try
end copyFiles
