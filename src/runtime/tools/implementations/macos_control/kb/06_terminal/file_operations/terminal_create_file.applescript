---
id: terminal_create_file
title: Terminal Create File
description: >-
  Create new files with optional content through the terminal, automatically
  creating parent directories if needed.
---
-- Terminal Create File
-- Create new files with optional content

on run
	try
		-- Default values for interactive mode
		set defaultDestination to ""
		set defaultContent to ""
		
		return createFile(defaultDestination, defaultContent)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set theDestination to "{destination}"
	set theContent to "{content}"
	
	-- Validate parameters
	if theDestination is "" then
		return "Error: Destination path is required for file creation."
	end if
	
	return createFile(theDestination, theContent)
end processMCPParameters

-- Function to create a new file with optional content
on createFile(filePath, fileContent)
	if filePath is "" then
		return "Error: Destination path is required for file creation."
	end if
	
	-- Check if file already exists
	set fileExists to do shell script "[ -e " & quoted form of filePath & " ] && echo 'exists' || echo 'not exists'"
	
	if fileExists is "exists" then
		set overwriteResponse to display dialog "File already exists. Do you want to overwrite it?" ¬
			buttons {"Cancel", "Overwrite"} default button "Cancel" with icon caution
		
		if button returned of overwriteResponse is "Cancel" then
			return "File creation cancelled."
		end if
	end if
	
	-- Create the parent directory if it doesn't exist
	set parentDir to do shell script "dirname " & quoted form of filePath
	do shell script "mkdir -p " & quoted form of parentDir
	
	-- Create the file with content
	try
		if fileContent is not "" then
			-- Write content to the file
			do shell script "cat > " & quoted form of filePath & " << 'EOFMARKER'
" & fileContent & "
EOFMARKER"
		else
			-- Create an empty file
			do shell script "touch " & quoted form of filePath
		end if
		
		return "Successfully created file: " & filePath
	on error errMsg
		return "Error creating file: " & errMsg
	end try
end createFile
