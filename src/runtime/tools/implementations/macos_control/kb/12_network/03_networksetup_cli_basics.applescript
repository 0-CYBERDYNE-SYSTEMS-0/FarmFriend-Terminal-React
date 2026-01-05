---
id: network_networksetup_cli
title: Network Configuration with networksetup
description: >-
  Manage network services, interfaces, Wi-Fi connections, and DNS settings using
  the networksetup command-line tool.
---
-- Network Management Utility Script

-- 1. Get list of all network services (interfaces)
on listNetworkServices()
  try
    set servicesCmd to "networksetup -listallnetworkservices"
    set servicesOutput to do shell script servicesCmd
    set allServices to paragraphs of servicesOutput
    
    -- Skip the first line which is an informational message
    set allServices to items 2 thru (count of allServices) of allServices
    
    return allServices
  on error errMsg
    return "Error getting network services: " & errMsg
  end try
end listNetworkServices

-- 2. Get active interfaces with IP addresses
on getActiveInterfaces()
  try
    -- Get interface information using ifconfig
    set networkInfo to do shell script "ifconfig | grep -E 'inet |status: active' -B 1 | grep -v 127.0.0.1"
    return "Active Network Interfaces:\n" & networkInfo
  on error errMsg
    return "Error getting active interfaces: " & errMsg
  end try
end getActiveInterfaces

-- 3. Get and Set Wi-Fi settings
on manageWiFi(action, parameter)
  if action is missing value then
    set action to "status"
  end if
  
  try
    if action is "status" then
      -- Get current Wi-Fi status and connected network
      set statusCmd to "networksetup -getairportnetwork en0"
      set wifiStatus to do shell script statusCmd
      return wifiStatus
      
    else if action is "on" then
      -- Turn on Wi-Fi
      do shell script "networksetup -setairportpower en0 on" with administrator privileges
      return "Wi-Fi turned ON"
      
    else if action is "off" then
      -- Turn off Wi-Fi
      do shell script "networksetup -setairportpower en0 off" with administrator privileges
      return "Wi-Fi turned OFF"
      
    else if action is "join" and parameter is not missing value then
      -- Join a Wi-Fi network (requires password for secured networks)
      set networkName to parameter
      set wifiPassword to ""
      
      display dialog "Enter password for Wi-Fi network '" & networkName & "':" default answer "" with hidden answer
      set wifiPassword to text returned of result
      
      do shell script "networksetup -setairportnetwork en0 " & quoted form of networkName & " " & quoted form of wifiPassword with administrator privileges
      return "Joined Wi-Fi network: " & networkName
      
    else if action is "scan" then
      -- Scan for available Wi-Fi networks
      set scanOutput to do shell script "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s"
      return "Available Wi-Fi Networks:\n" & scanOutput
    end if
    
  on error errMsg
    return "Error managing Wi-Fi: " & errMsg
  end try
end manageWiFi

-- 4. Get and Set DNS settings
on manageDNS(action, dnsServers, networkService)
  if networkService is missing value then
    -- Try to get the current active service
    set services to my listNetworkServices()
    set networkService to item 1 of services
  end if
  
  try
    if action is "get" then
      -- Get current DNS settings
      set dnsCmd to "networksetup -getdnsservers " & quoted form of networkService
      set dnsSettings to do shell script dnsCmd
      return "DNS Servers for " & networkService & ":\n" & dnsSettings
      
    else if action is "set" and dnsServers is not missing value then
      -- Set DNS servers
      set dnsString to ""
      repeat with dns in dnsServers
        set dnsString to dnsString & " " & dns
      end repeat
      
      set setDnsCmd to "networksetup -setdnsservers " & quoted form of networkService & dnsString
      do shell script setDnsCmd with administrator privileges
      return "DNS servers updated for " & networkService
    end if
    
  on error errMsg
    return "Error managing DNS: " & errMsg
  end try
end manageDNS

-- 5. Get/Set network location
on manageNetworkLocation(action, locationName)
  try
    if action is "current" then
      -- Get current location
      set locationCmd to "networksetup -getcurrentlocation"
      set currentLocation to do shell script locationCmd
      return "Current network location: " & currentLocation
      
    else if action is "list" then
      -- List all available locations
      set locationsCmd to "networksetup -listlocations"
      set locationsList to do shell script locationsCmd
      return "Available network locations:\n" & locationsList
      
    else if action is "switch" and locationName is not missing value then
      -- Switch to a different network location
      set switchCmd to "networksetup -switchtolocation " & quoted form of locationName
      do shell script switchCmd with administrator privileges
      return "Switched to network location: " & locationName
    end if
    
  on error errMsg
    return "Error managing network location: " & errMsg
  end try
end manageNetworkLocation

-- Example usage
set networkServices to my listNetworkServices()
set activeInterfaces to my getActiveInterfaces()
set wifiStatus to my manageWiFi("status", "")
set dnsSettings to my manageDNS("get", {}, item 1 of networkServices)
set currentLocation to my manageNetworkLocation("current", "")

-- Combine all information for return
set networkReport to "Network Configuration Report" & return & return & ¬
  "Network Services:" & return & networkServices & return & return & ¬
  activeInterfaces & return & return & ¬
  "Wi-Fi Status:" & return & wifiStatus & return & return & ¬
  dnsSettings & return & return & ¬
  currentLocation

return networkReport
