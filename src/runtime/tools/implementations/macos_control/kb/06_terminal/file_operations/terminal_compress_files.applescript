---
id: terminal_compress_files
title: Terminal Compress Files
description: >-
  Compress files or directories into various archive formats through the terminal,
  automatically adjusting compression commands based on the source type.
---
-- Terminal Compress Files
-- Compress files or directories into archives

on run
	try
		-- Default values for interactive mode
		set defaultSource to ""
		set defaultDestination to ""
		
		return compressFiles(defaultSource, defaultDestination)
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
		return "Error: Source path is required for compression."
	end if
	
	if theDestination is "" then
		return "Error: Destination archive path is required for compression."
	end if
	
	return compressFiles(theSource, theDestination)
end processMCPParameters

-- Function to compress files or directories
on compressFiles(sourcePath, destArchive)
	-- Check if source exists
	set sourceExists to do shell script "[ -e " & quoted form of sourcePath & " ] && echo 'exists' || echo 'not exists'"
	
	if sourceExists is "not exists" then
		return "Error: Source path does not exist: " & sourcePath
	end if
	
	-- Determine archive type based on destination extension
	set archiveExtension to my getFileExtension(destArchive)
	set archiveExtension to my toLower(archiveExtension)
	
	-- Get source basename for archive creation
	set sourceBasename to do shell script "basename " & quoted form of sourcePath
	
	-- Construct and execute the appropriate compress command based on file type
	set compressCommand to ""
	
	if archiveExtension is "zip" then
		-- Check if source is a directory
		set sourceType to do shell script "[ -d " & quoted form of sourcePath & " ] && echo 'directory' || echo 'file'"
		
		if sourceType is "directory" then
			-- For directories, we need to change to the parent dir and zip from there
			set parentDir to do shell script "dirname " & quoted form of sourcePath
			set compressCommand to "cd " & quoted form of parentDir & " && zip -r " & ¬
				quoted form of destArchive & " " & quoted form of sourceBasename
		else
			-- For files, we can zip directly
			set compressCommand to "zip -j " & quoted form of destArchive & " " & quoted form of sourcePath
		end if
	else if archiveExtension is "tar" then
		set compressCommand to "tar -cf " & quoted form of destArchive & " -C " & ¬
			quoted form of (do shell script "dirname " & quoted form of sourcePath) & " " & ¬
			quoted form of sourceBasename
	else if archiveExtension is in {"tgz", "tar.gz"} then
		set compressCommand to "tar -czf " & quoted form of destArchive & " -C " & ¬
			quoted form of (do shell script "dirname " & quoted form of sourcePath) & " " & ¬
			quoted form of sourceBasename
	else if archiveExtension is in {"tbz2", "tar.bz2"} then
		set compressCommand to "tar -cjf " & quoted form of destArchive & " -C " & ¬
			quoted form of (do shell script "dirname " & quoted form of sourcePath) & " " & ¬
			quoted form of sourceBasename
	else if archiveExtension is in {"txz", "tar.xz"} then
		set compressCommand to "tar -cJf " & quoted form of destArchive & " -C " & ¬
			quoted form of (do shell script "dirname " & quoted form of sourcePath) & " " & ¬
			quoted form of sourceBasename
	else if archiveExtension is "7z" then
		-- Check if 7zip is installed
		try
			do shell script "which 7z"
			set compressCommand to "7z a " & quoted form of destArchive & " " & quoted form of sourcePath
		on error
			return "Error: 7zip is not installed. Please install it using Homebrew: brew install p7zip"
		end try
	else
		return "Error: Unsupported archive format: " & archiveExtension & ¬
			". Supported formats are: zip, tar, tgz, tar.gz, tbz2, tar.bz2, txz, tar.xz, 7z."
	end if
	
	-- Execute compression command
	try
		do shell script compressCommand
		return "Successfully compressed " & sourcePath & " to " & destArchive
	on error errMsg
		return "Error compressing: " & errMsg
	end try
end compressFiles

-- Helper function to get file extension
on getFileExtension(filePath)
	set fileName to do shell script "basename " & quoted form of filePath
	
	-- Check for double extensions like .tar.gz
	if fileName ends with ".tar.gz" then
		return "tar.gz"
	else if fileName ends with ".tar.bz2" then
		return "tar.bz2"
	else if fileName ends with ".tar.xz" then
		return "tar.xz"
	end if
	
	-- Regular extension
	if fileName contains "." then
		set AppleScript's text item delimiters to "."
		set textItems to text items of fileName
		set lastItem to item (count of textItems) of textItems
		set AppleScript's text item delimiters to ""
		return lastItem
	else
		return ""
	end if
end getFileExtension

-- Helper function to convert text to lowercase
on toLower(theText)
	set lowercaseText to ""
	repeat with i from 1 to length of theText
		set currentChar to character i of theText
		if ASCII number of currentChar ≥ 65 and ASCII number of currentChar ≤ 90 then
			-- Convert uppercase letter to lowercase
			set lowercaseText to lowercaseText & (ASCII character ((ASCII number of currentChar) + 32))
		else
			-- Keep the character as is
			set lowercaseText to lowercaseText & currentChar
		end if
	end repeat
	return lowercaseText
end toLower
