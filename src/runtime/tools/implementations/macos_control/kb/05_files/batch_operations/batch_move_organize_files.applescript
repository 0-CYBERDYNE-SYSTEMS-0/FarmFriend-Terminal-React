---
id: batch_move_organize_files
title: Batch Move and Organize Files
description: >-
  Move multiple files to a target folder with optional organization by creation
  date, automatically creating date-based subfolders for better file management.
---
-- Batch Move and Organize Files
-- Move files with optional date-based organization

on run
	try
		-- Use file selection dialog for interactive mode
		set fileList to chooseFiles()
		set targetFolder to chooseFolder()
		
		-- Ask about date organization
		set organizeByDate to button returned of (display dialog "Organize files by creation date?" buttons {"No", "Yes"} default button "Yes") is "Yes"
		
		return batchMove(fileList, targetFolder, organizeByDate)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set fileList to "{fileList}"
	set targetFolder to "{targetFolder}"
	set organizeByDate to "{organizeByDate}"
	
	-- Default values
	if organizeByDate is "" then
		set organizeByDate to false
	else
		try
			set organizeByDate to organizeByDate as boolean
		on error
			set organizeByDate to false
		end try
	end if
	
	-- Validate parameters
	if fileList is "" or class of fileList is not list then
		return "Error: File list is required and must be a list."
	end if
	
	if targetFolder is "" then
		return "Error: Target folder is required."
	end if
	
	return batchMove(fileList, targetFolder, organizeByDate)
end processMCPParameters

-- Choose multiple files for batch processing
on chooseFiles()
	set theFiles to {}
	set dialogResult to (choose file with prompt "Select files to move:" with multiple selections allowed)
	
	-- Convert results to a list of POSIX paths
	repeat with aFile in dialogResult
		set end of theFiles to POSIX path of aFile
	end repeat
	
	return theFiles
end chooseFiles

-- Choose a folder as target for operations
on chooseFolder()
	set theFolder to choose folder with prompt "Select target folder:"
	return POSIX path of theFolder
end chooseFolder

-- Move files to target folder, optionally organizing by creation date
on batchMove(fileList, targetFolder, organizeByDate)
	set movedFiles to {}
	
	repeat with filePath in fileList
		set fullPath to filePath as string
		set fileName to do shell script "basename " & quoted form of fullPath
		
		-- Determine destination path
		if organizeByDate then
			-- Get file creation date
			set fileDate to do shell script "stat -f '%SB' -t '%Y-%m-%d' " & quoted form of fullPath
			set dateFolder to targetFolder & "/" & fileDate
			
			-- Create date folder if it doesn't exist
			do shell script "mkdir -p " & quoted form of dateFolder
			set destPath to dateFolder & "/" & fileName
		else
			set destPath to targetFolder & "/" & fileName
		end if
		
		-- Move the file
		try
			do shell script "mv " & quoted form of fullPath & " " & quoted form of destPath
			set end of movedFiles to destPath
		on error errMsg
			log "Error moving " & fullPath & ": " & errMsg
		end try
	end repeat
	
	if organizeByDate then
		return "Moved " & (count of movedFiles) & " files, organized by date"
	else
		return "Moved " & (count of movedFiles) & " files to target folder"
	end if
end batchMove
