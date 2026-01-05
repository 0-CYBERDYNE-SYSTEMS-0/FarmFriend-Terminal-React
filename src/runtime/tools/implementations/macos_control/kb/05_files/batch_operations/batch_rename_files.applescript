---
id: batch_rename_files
title: Batch Rename Files
description: >-
  Rename multiple files using patterns with sequence numbers and original filenames,
  supporting custom naming templates and automatic numbering.
---
-- Batch Rename Files
-- Pattern can include [N] for sequence number and [NAME] for original name

on run
	try
		-- Use file selection dialog for interactive mode
		set fileList to chooseFiles()
		
		-- Get renaming pattern from user
		set pattern to text returned of (display dialog "Enter naming pattern:
[N] = sequence number
[NAME] = original filename" default answer "Project_[N]_[NAME]")
		
		-- Get starting number
		set startNumber to text returned of (display dialog "Enter starting number:" default answer "1") as integer
		
		return batchRename(fileList, pattern, startNumber)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set fileList to "{fileList}"
	set pattern to "{pattern}"
	set startNumber to "{startNumber}"
	
	-- Default values
	if pattern is "" then
		set pattern to "File_[N]"
	end if
	
	if startNumber is "" then
		set startNumber to 1
	else
		try
			set startNumber to startNumber as integer
		on error
			set startNumber to 1
		end try
	end if
	
	-- Validate file list
	if fileList is "" or class of fileList is not list then
		return "Error: File list is required and must be a list."
	end if
	
	return batchRename(fileList, pattern, startNumber)
end processMCPParameters

-- Choose multiple files for batch processing
on chooseFiles()
	set theFiles to {}
	set dialogResult to (choose file with prompt "Select files for batch renaming:" with multiple selections allowed)
	
	-- Convert results to a list of POSIX paths
	repeat with aFile in dialogResult
		set end of theFiles to POSIX path of aFile
	end repeat
	
	return theFiles
end chooseFiles

-- Batch file rename with pattern
on batchRename(fileList, pattern, startNumber)
	set renamedFiles to {}
	set counter to startNumber
	
	repeat with filePath in fileList
		-- Get file info
		set fullPath to filePath as string
		set {name:originalName, extension:fileExtension} to getFileInfo(fullPath)
		
		-- Create new name based on pattern
		set newName to pattern
		
		-- Replace [N] with sequence number (padded if needed)
		if newName contains "[N]" then
			set paddedNumber to text -3 thru -1 of ("000" & counter)
			set newName to my replaceText(newName, "[N]", paddedNumber)
		end if
		
		-- Replace [NAME] with original filename
		if newName contains "[NAME]" then
			set newName to my replaceText(newName, "[NAME]", originalName)
		end if
		
		-- Add extension if needed
		if fileExtension is not "" then
			set newName to newName & "." & fileExtension
		end if
		
		-- Get directory path
		set oldFolder to do shell script "dirname " & quoted form of fullPath
		set newPath to oldFolder & "/" & newName
		
		-- Rename file
		try
			do shell script "mv " & quoted form of fullPath & " " & quoted form of newPath
			set end of renamedFiles to newPath
		on error errMsg
			log "Error renaming " & fullPath & ": " & errMsg
		end try
		
		set counter to counter + 1
	end repeat
	
	return "Renamed " & (count of renamedFiles) & " files successfully"
end batchRename

-- Helper function to get file info
on getFileInfo(filePath)
	set fileName to do shell script "basename " & quoted form of filePath
	
	-- Split filename and extension
	set tid to AppleScript's text item delimiters
	set AppleScript's text item delimiters to "."
	set nameParts to text items of fileName
	
	if (count of nameParts) > 1 then
		set baseName to items 1 thru -2 of nameParts as text
		set fileExtension to item -1 of nameParts
	else
		set baseName to fileName
		set fileExtension to ""
	end if
	
	-- Restore text item delimiters
	set AppleScript's text item delimiters to tid
	
	return {name:baseName, extension:fileExtension}
end getFileInfo

-- Helper function for text replacement
on replaceText(sourceText, searchString, replacementString)
	set tid to AppleScript's text item delimiters
	set AppleScript's text item delimiters to searchString
	set textItems to text items of sourceText
	set AppleScript's text item delimiters to replacementString
	set newText to textItems as text
	set AppleScript's text item delimiters to tid
	return newText
end replaceText
