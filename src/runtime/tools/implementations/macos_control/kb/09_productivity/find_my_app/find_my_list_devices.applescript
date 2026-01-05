---
id: find_my_list_devices
title: List All Devices in Find My App
description: >-
  Lists all devices associated with the user's Apple ID in the Find My app,
  including their online status if available
---
-- List all devices in Find My app
-- Returns a list of records with name and status of each device

on run
    return listFindMyDevices()
end run

on listFindMyDevices()
    set deviceList to {}
    
    try
        -- Launch Find My app
        tell application "Find My"
            activate
            -- Give the app time to fully load
            delay 1
        end tell
        
        -- Use UI scripting to interact with the app
        tell application "System Events"
            tell process "Find My"
                -- Wait for the window to appear
                repeat until (exists window 1)
                    delay 0.5
                end repeat
                
                -- Make sure the sidebar is visible (Devices section)
                if exists group 1 of window 1 then
                    -- Look for the sidebar where devices are listed
                    if exists scroll area 1 of group 1 of window 1 then
                        set sidebarItems to UI elements of scroll area 1 of group 1 of window 1
                        
                        -- Extract device information
                        repeat with anItem in sidebarItems
                            try
                                if exists static text 1 of anItem then
                                    set deviceName to value of static text 1 of anItem
                                    
                                    -- Try to get status (might not exist for all devices)
                                    set deviceStatus to "Unknown"
                                    try
                                        if exists static text 2 of anItem then
                                            set deviceStatus to value of static text 2 of anItem
                                        end if
                                    end try
                                    
                                    -- Add device to our list
                                    set end of deviceList to {name:deviceName, status:deviceStatus}
                                end if
                            on error
                                -- Skip items that don't have the expected structure
                            end try
                        end repeat
                    end if
                end if
            end tell
        end tell
        
        -- Quit Find My app when done
        tell application "Find My" to quit
        
        return deviceList
    on error errMsg
        -- Ensure the app quits if there's an error
        try
            tell application "Find My" to quit
        end try
        
        return {error:"Error retrieving devices: " & errMsg}
    end try
end listFindMyDevices

-- Example of calling with MCP
-- execute_script(id="find_my_list_devices")
-- Response: [{name:"iPhone", status:"Online"}, {name:"MacBook Pro", status:"This Mac"}, ...]
