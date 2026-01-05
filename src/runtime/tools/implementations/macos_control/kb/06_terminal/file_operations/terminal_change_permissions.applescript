---
id: terminal_change_permissions
title: Terminal Change Permissions
description: >-
  Change file or directory permissions through the terminal using chmod,
  with optional recursive changes for directories.
---
-- Terminal Change Permissions
-- Modify file or directory permissions

on run
	try
		-- Default values for interactive mode
		set defaultSource to ""
		set defaultPermissions to ""
		
		return changePermissions(defaultSource, defaultPermissions)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set theSource to "{source}"
	set thePermissions to "{permissions}"
	
	-- Validate parameters
	if theSource is "" then
		return "Error: Source path is required for permission change."
	end if
	
	if thePermissions is "" then
		return "Error: Permissions value is required."
	end if
	
	return changePermissions(theSource, thePermissions)
end processMCPParameters

-- Function to change file permissions
on changePermissions(filePath, permissions)
	-- Check if source exists
	set sourceExists to do shell script "[ -e " & quoted form of filePath & " ] && echo 'exists' || echo 'not exists'"
	
	if sourceExists is "not exists" then
		return "Error: Path does not exist: " & filePath
	end if
	
	-- Validate permissions format
	if permissions is "" then
		return "Error: Permissions must be specified (e.g., 755, 644, etc.)."
	end if
	
	-- Basic validation of permission format
	try
		set permValue to permissions as integer
		if permValue < 0 or permValue > 777 then
			return "Error: Permission value must be between 0 and 777."
		end if
	on error
		return "Error: Invalid permission format. Use octal notation (e.g., 755, 644)."
	end try
	
	-- Execute chmod command
	try
		do shell script "chmod " & permissions & " " & quoted form of filePath
		
		-- Check if it's a directory and user wants to apply recursively
		set isDir to do shell script "[ -d " & quoted form of filePath & " ] && echo 'yes' || echo 'no'"
		
		if isDir is "yes" then
			set recursiveResponse to display dialog "Do you want to apply these permissions recursively to all files and subdirectories?" ¬
				buttons {"No", "Yes"} default button "No"
			
			if button returned of recursiveResponse is "Yes" then
				do shell script "chmod -R " & permissions & " " & quoted form of filePath
				return "Successfully changed permissions recursively to " & permissions & " for: " & filePath
			end if
		end if
		
		return "Successfully changed permissions to " & permissions & " for: " & filePath
	on error errMsg
		return "Error changing permissions: " & errMsg
	end try
end changePermissions
