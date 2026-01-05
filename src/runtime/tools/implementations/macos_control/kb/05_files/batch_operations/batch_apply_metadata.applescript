---
id: batch_apply_metadata
title: Batch Apply Metadata
description: >-
  Apply macOS tags and comments to multiple files using Finder, enabling
  better file organization and searchability.
---
-- Batch Apply Metadata
-- Apply tags and comments to multiple files

on run
	try
		-- Use file selection dialog for interactive mode
		set fileList to chooseFiles()
		
		-- Get tags from user
		set tagsInput to text returned of (display dialog "Enter tags (comma-separated):" default answer "Important, Project X")
		set tagsToApply to my splitString(tagsInput, ",")
		
		-- Trim spaces from tags
		repeat with i from 1 to count of tagsToApply
			set item i of tagsToApply to my trimSpaces(item i of tagsToApply)
		end repeat
		
		-- Get comment from user
		set commentText to text returned of (display dialog "Enter comment (optional):" default answer "Processed on " & (current date) as string)
		
		return batchApplyMetadata(fileList, tagsToApply, commentText)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set fileList to "{fileList}"
	set tagsToApply to "{tags}"
	set commentText to "{comment}"
	
	-- Default values
	if tagsToApply is "" then
		set tagsToApply to {}
	else if class of tagsToApply is text then
		-- Convert comma-separated string to list
		set tagsToApply to my splitString(tagsToApply, ",")
		repeat with i from 1 to count of tagsToApply
			set item i of tagsToApply to my trimSpaces(item i of tagsToApply)
		end repeat
	end if
	
	if commentText is "" then
		set commentText to ""
	end if
	
	-- Validate file list
	if fileList is "" or class of fileList is not list then
		return "Error: File list is required and must be a list."
	end if
	
	return batchApplyMetadata(fileList, tagsToApply, commentText)
end processMCPParameters

-- Choose multiple files for batch processing
on chooseFiles()
	set theFiles to {}
	set dialogResult to (choose file with prompt "Select files for metadata application:" with multiple selections allowed)
	
	-- Convert results to a list of POSIX paths
	repeat with aFile in dialogResult
		set end of theFiles to POSIX path of aFile
	end repeat
	
	return theFiles
end chooseFiles

-- Apply metadata (tags, comments) to multiple files via Finder
on batchApplyMetadata(fileList, tagsToApply, commentText)
	set processedFiles to 0
	set errorFiles to 0
	
	tell application "Finder"
		repeat with filePath in fileList
			try
				set theFile to POSIX file filePath as alias
				
				-- Apply tags if provided
				if tagsToApply is not {} then
					set tags of theFile to tagsToApply
				end if
				
				-- Apply comment if provided
				if commentText is not "" then
					set comment of theFile to commentText
				end if
				
				set processedFiles to processedFiles + 1
			on error errMsg
				log "Error applying metadata to " & filePath & ": " & errMsg
				set errorFiles to errorFiles + 1
			end try
		end repeat
	end tell
	
	set resultMessage to "Metadata applied to " & processedFiles & " files"
	if errorFiles > 0 then
		set resultMessage to resultMessage & " (" & errorFiles & " errors)"
	end if
	
	return resultMessage
end batchApplyMetadata

-- Helper function to split string
on splitString(theString, theDelimiter)
	set tid to AppleScript's text item delimiters
	set AppleScript's text item delimiters to theDelimiter
	set theItems to text items of theString
	set AppleScript's text item delimiters to tid
	return theItems
end splitString

-- Helper function to trim spaces
on trimSpaces(theText)
	set theText to theText as string
	-- Remove leading spaces
	repeat while theText starts with " "
		set theText to text 2 thru -1 of theText
	end repeat
	-- Remove trailing spaces
	repeat while theText ends with " "
		set theText to text 1 thru -2 of theText
	end repeat
	return theText
end trimSpaces
