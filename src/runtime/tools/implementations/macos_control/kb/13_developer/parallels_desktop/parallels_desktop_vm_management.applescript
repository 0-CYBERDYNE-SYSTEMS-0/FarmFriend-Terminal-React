---
id: parallels_desktop_vm_management
title: Parallels Desktop VM Management
description: The operation to perform (list, start, stop, suspend, status)
---
-- Parallels Desktop VM Management
-- This script demonstrates various operations with Parallels Desktop virtual machines
-- Operations: list, start, stop, suspend, status

on run {vmName, operation}
	-- Set default values if parameters are not provided
	if vmName is missing value then set vmName to "{vmName}"
	if operation is missing value then set operation to "{operation}"
	
	-- Validate operation parameter
	set validOperations to {"list", "start", "stop", "suspend", "status"}
	if operation is not in validOperations then
		return "Error: Invalid operation. Please use one of: " & validOperations as string
	end if
	
	-- Main control flow based on the requested operation
	try
		if operation is "list" then
			return listVirtualMachines()
		else if operation is "status" then
			return getVMStatus(vmName)
		else if operation is "start" then
			return startVM(vmName)
		else if operation is "stop" then
			return stopVM(vmName)
		else if operation is "suspend" then
			return suspendVM(vmName)
		end if
	on error errMsg
		return "Error: " & errMsg
	end try
end run

-- Lists all available virtual machines
on listVirtualMachines()
	try
		tell application "Parallels Desktop"
			set vmList to {}
			set allVMs to every virtual machine
			
			repeat with currentVM in allVMs
				set vmName to name of currentVM
				set vmState to state of currentVM as string
				set end of vmList to vmName & " (" & vmState & ")"
			end repeat
			
			if length of vmList is 0 then
				return "No virtual machines found."
			else
				return "Available virtual machines:" & linefeed & (vmList as string)
			end if
		end tell
	on error errMsg
		return "Failed to list virtual machines: " & errMsg
	end try
end listVirtualMachines

-- Checks if the specified VM exists
on vmExists(vmName)
	try
		tell application "Parallels Desktop"
			set allVMs to every virtual machine
			repeat with currentVM in allVMs
				if name of currentVM is vmName then
					return true
				end if
			end repeat
		end tell
		return false
	on error
		return false
	end try
end vmExists

-- Gets the current status of a VM
on getVMStatus(vmName)
	if not vmExists(vmName) then
		return "Error: Virtual machine '" & vmName & "' does not exist."
	end if
	
	try
		tell application "Parallels Desktop"
			set targetVM to virtual machine vmName
			set vmState to state of targetVM as string
			return "Virtual machine '" & vmName & "' is currently " & vmState & "."
		end tell
	on error errMsg
		return "Failed to get status for '" & vmName & "': " & errMsg
	end try
end getVMStatus

-- Starts a VM
on startVM(vmName)
	if not vmExists(vmName) then
		return "Error: Virtual machine '" & vmName & "' does not exist."
	end if
	
	try
		tell application "Parallels Desktop"
			set targetVM to virtual machine vmName
			
			-- Only start if not already running
			if state of targetVM is not running then
				start targetVM
				return "Starting virtual machine '" & vmName & "'."
			else
				return "Virtual machine '" & vmName & "' is already running."
			end if
		end tell
	on error errMsg
		return "Failed to start '" & vmName & "': " & errMsg
	end try
end startVM

-- Stops a VM (power off)
on stopVM(vmName)
	if not vmExists(vmName) then
		return "Error: Virtual machine '" & vmName & "' does not exist."
	end if
	
	try
		tell application "Parallels Desktop"
			set targetVM to virtual machine vmName
			
			-- Only stop if running
			if state of targetVM is running then
				-- Using force stop (equivalent to power off)
				stop targetVM with force
				return "Stopping virtual machine '" & vmName & "'."
			else
				return "Virtual machine '" & vmName & "' is not running."
			end if
		end tell
	on error errMsg
		return "Failed to stop '" & vmName & "': " & errMsg
	end try
end stopVM

-- Suspends a VM (save state)
on suspendVM(vmName)
	if not vmExists(vmName) then
		return "Error: Virtual machine '" & vmName & "' does not exist."
	end if
	
	try
		tell application "Parallels Desktop"
			set targetVM to virtual machine vmName
			
			-- Only suspend if running
			if state of targetVM is running then
				suspend targetVM
				return "Suspending virtual machine '" & vmName & "'."
			else
				return "Virtual machine '" & vmName & "' is not running."
			end if
		end tell
	on error errMsg
		return "Failed to suspend '" & vmName & "': " & errMsg
	end try
end suspendVM

-- Advanced operations that could be added:
-- - Clone a VM
-- - Take a snapshot
-- - Restore from a snapshot
-- - Change VM configuration
-- - Execute commands inside the VM (requires guest tools)
