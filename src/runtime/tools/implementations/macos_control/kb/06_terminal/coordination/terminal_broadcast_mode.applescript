---
id: terminal_broadcast_mode
title: Terminal Broadcast Mode
description: >-
  Broadcast the same command to multiple terminal windows, tabs, or panes
  simultaneously across Terminal.app, iTerm2, and Ghostty.
---
-- Terminal Broadcast Mode
-- Send same command to multiple terminals

on run
	try
		-- Default values for interactive mode
		set defaultText to ""
		set defaultTerminals to {"Terminal.app", "iTerm2", "Ghostty"}
		set defaultTargets to {}
		set defaultExecuteCommands to true
		
		return broadcastCommand(defaultText, defaultTerminals, defaultTargets, defaultExecuteCommands)
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Handle MCP parameters
on processMCPParameters(inputParams)
	-- Extract parameters
	set theText to "{text}"
	set theTerminals to "{terminals}"
	set theTargets to "{targets}"
	set executeCommands to "{executeCommands}"
	
	-- Default values
	if theTerminals is "" then
		set theTerminals to {"Terminal.app", "iTerm2", "Ghostty"}
	end if
	
	if theTargets is "" then
		set theTargets to {}
	end if
	
	if executeCommands is "" then
		set executeCommands to true
	else
		try
			set executeCommands to executeCommands as boolean
		on error
			set executeCommands to true
		end try
	end if
	
	-- Validate input
	if theText is "" then
		return "Error: No text or command provided to broadcast."
	end if
	
	return broadcastCommand(theText, theTerminals, theTargets, executeCommands)
end processMCPParameters

-- Main broadcast function
on broadcastCommand(textToSend, terminals, targets, shouldExecute)
	set successCount to 0
	set failCount to 0
	set resultMessage to ""
	
	-- Check which terminals are running
	set runningTerminals to {}
	
	tell application "System Events"
		if "Terminal" is in (name of processes) and "Terminal.app" is in terminals then
			set end of runningTerminals to "Terminal.app"
		end if
		if "iTerm2" is in (name of processes) and "iTerm2" is in terminals then
			set end of runningTerminals to "iTerm2"
		end if
		if "Ghostty" is in (name of processes) and "Ghostty" is in terminals then
			set end of runningTerminals to "Ghostty"
		end if
	end tell
	
	if length of runningTerminals is 0 then
		return "Error: None of the specified terminal applications are running."
	end if
	
	-- Process Terminal.app
	if "Terminal.app" is in runningTerminals then
		try
			tell application "Terminal"
				activate
				
				-- Determine target windows/tabs
				if length of targets is 0 then
					-- Target all windows and tabs
					repeat with i from 1 to count of windows
						set currentWindow to window i
						repeat with j from 1 to count of tabs of currentWindow
							set currentTab to tab j of currentWindow
							
							-- Send the text
							tell currentTab
								set selected of currentTab to true
								delay 0.3
								
								tell application "System Events" to tell process "Terminal"
									keystroke textToSend
									if shouldExecute then keystroke return
								end tell
							end tell
							
							set successCount to successCount + 1
							delay 0.3
						end repeat
					end repeat
				else
					-- Target specific windows/tabs from targets list
					set {successTargets, failTargets} to my processTerminalTargets(targets, textToSend, shouldExecute)
					set successCount to successCount + successTargets
					set failCount to failCount + failTargets
				end if
			end tell
		on error errMsg
			set resultMessage to resultMessage & "Error with Terminal.app: " & errMsg & "\n"
			set failCount to failCount + 1
		end try
	end if
	
	-- Process iTerm2
	if "iTerm2" is in runningTerminals then
		try
			tell application "iTerm2"
				activate
				
				-- Determine target windows/tabs/sessions
				if length of targets is 0 then
					-- Target all windows, tabs, and sessions
					repeat with i from 1 to count of windows
						tell window i
							repeat with j from 1 to count of tabs
								tell tab j
									repeat with k from 1 to count of sessions
										tell session k
											-- Select the session
											select
											delay 0.3
											
											-- Send the text
											if shouldExecute then
												write text textToSend
											else
												-- Echo without executing
												tell application "System Events" to tell process "iTerm2"
													keystroke textToSend
												end tell
											end if
											
											set successCount to successCount + 1
										end tell
									end repeat
								end tell
							end repeat
						end tell
					end repeat
				else
					-- Target specific windows/tabs/sessions from targets list
					set {successTargets, failTargets} to my processITermTargets(targets, textToSend, shouldExecute)
					set successCount to successCount + successTargets
					set failCount to failCount + failTargets
				end if
			end tell
		on error errMsg
			set resultMessage to resultMessage & "Error with iTerm2: " & errMsg & "\n"
			set failCount to failCount + 1
		end try
	end if
	
	-- Process Ghostty
	if "Ghostty" is in runningTerminals then
		try
			tell application "Ghostty"
				activate
				
				-- Ghostty has limited AppleScript support, use UI automation
				tell application "System Events" to tell process "Ghostty"
					-- Send to the active window
					keystroke textToSend
					if shouldExecute then keystroke return
				end tell
				
				set successCount to successCount + 1
			end tell
		on error errMsg
			set resultMessage to resultMessage & "Error with Ghostty: " & errMsg & "\n"
			set failCount to failCount + 1
		end try
	end if
	
	-- Build result message
	if successCount > 0 then
		set resultMessage to resultMessage & "Broadcast successful to " & successCount & " terminal" & (if successCount = 1 then "" else "s") & ". "
	end if
	
	if failCount > 0 then
		set resultMessage to resultMessage & "Failed to reach " & failCount & " terminal" & (if failCount = 1 then "" else "s") & "."
	end if
	
	return resultMessage
end broadcastCommand

-- Process Terminal.app specific targets
on processTerminalTargets(targets, textToSend, shouldExecute)
	set successCount to 0
	set failCount to 0
	
	repeat with targetSpec in targets
		if targetSpec starts with "Terminal.app:" then
			set targetParts to my splitString(targetSpec, ":")
			
			if (count of targetParts) ≥ 3 then
				try
					set windowIndex to item 2 of targetParts as integer
					set tabIndex to item 3 of targetParts as integer
					
					tell application "Terminal"
						if windowIndex > 0 and windowIndex ≤ (count of windows) and ¬
							tabIndex > 0 and tabIndex ≤ (count of tabs of window windowIndex) then
							set currentTab to tab tabIndex of window windowIndex
							
							-- Send the text
							tell currentTab
								set selected of currentTab to true
								delay 0.3
								
								tell application "System Events" to tell process "Terminal"
									keystroke textToSend
									if shouldExecute then keystroke return
								end tell
							end tell
							
							set successCount to successCount + 1
						else
							set failCount to failCount + 1
						end if
					end tell
				on error
					set failCount to failCount + 1
				end try
			end if
		end if
	end repeat
	
	return {successCount, failCount}
end processTerminalTargets

-- Process iTerm2 specific targets
on processITermTargets(targets, textToSend, shouldExecute)
	set successCount to 0
	set failCount to 0
	
	repeat with targetSpec in targets
		if targetSpec starts with "iTerm2:" then
			set targetParts to my splitString(targetSpec, ":")
			
			if (count of targetParts) ≥ 4 then
				try
					set windowIndex to item 2 of targetParts as integer
					set tabIndex to item 3 of targetParts as integer
					set sessionIndex to item 4 of targetParts as integer
					
					tell application "iTerm2"
						tell window windowIndex
							tell tab tabIndex
								tell session sessionIndex
									-- Select the session
									select
									delay 0.3
									
									-- Send the text
									if shouldExecute then
										write text textToSend
									else
										-- Echo without executing
										tell application "System Events" to tell process "iTerm2"
											keystroke textToSend
										end tell
									end if
									
									set successCount to successCount + 1
								end tell
							end tell
						end tell
					end tell
				on error
					set failCount to failCount + 1
				end try
			end if
		end if
	end repeat
	
	return {successCount, failCount}
end processITermTargets

-- Helper function to split string
on splitString(theString, theDelimiter)
	set oldDelimiters to AppleScript's text item delimiters
	set AppleScript's text item delimiters to theDelimiter
	set theItems to text items of theString
	set AppleScript's text item delimiters to oldDelimiters
	return theItems
end splitString
