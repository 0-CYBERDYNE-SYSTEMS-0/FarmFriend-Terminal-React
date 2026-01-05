---
id: system_network_location_switching
title: System Preferences: Switch Network Locations
description: >-
  Switch between network locations using shell commands, enabling easy
  transitions between different network configurations.
---
{locationName}

on switchNetworkLocation(locationName)
  if locationName is missing value or locationName is "" then
    return "error: Location name not provided."
  end if
  
  -- First, list available network locations to verify the requested one exists
  try
    set locationListCmd to "networksetup -listlocations"
    set availableLocations to paragraphs of (do shell script locationListCmd)
    
    -- Check if requested location exists
    set locationExists to false
    repeat with locName in availableLocations
      if locName is locationName then
        set locationExists to true
        exit repeat
      end if
    end repeat
    
    if not locationExists then
      return "error: Location '" & locationName & "' not found. Available locations: " & (availableLocations as text)
    end if
    
    -- Switch to the requested location
    set switchCmd to "networksetup -switchtolocation " & quoted form of locationName
    do shell script switchCmd with administrator privileges
    
    -- Get current location to confirm the switch
    set currentLocationCmd to "networksetup -getcurrentlocation"
    set currentLocation to do shell script currentLocationCmd
    
    if currentLocation is locationName then
      return "Successfully switched to network location: " & locationName
    else
      return "Warning: Command completed but current location is: " & currentLocation
    end if
  on error errMsg
    return "Error switching network location: " & errMsg
  end try
end switchNetworkLocation

return my switchNetworkLocation("{locationName}")
