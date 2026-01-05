---
id: system_sound_io_selection
title: Sound Output and Input Device Selection
description: >-
  Control sound input and output device selection using AppleScript with UI
  scripting or shell commands.
---
-- Sound Input/Output Device Management

-- 1. List available audio devices (inputs and outputs)
on listAudioDevices()
  try
    -- Use the 'audiodevice' tool (part of switchaudio-osx, homebrew install switchaudio-osx)
    -- Alternative if switchaudio-osx isn't available: system_profiler SPAudioDataType
    set audioDevicesCmd to "system_profiler SPAudioDataType | grep -E 'Output|Input|Device:'"
    set devicesInfo to do shell script audioDevicesCmd
    
    return "Available Audio Devices:" & return & return & devicesInfo
  on error errMsg
    return "Error listing audio devices: " & errMsg
  end try
end listAudioDevices

-- 2. Get current audio output and input devices (shell-based approach)
on getCurrentAudioDevices()
  try
    -- Get current output device
    set outputCmd to "defaults read com.apple.systempreferences.plist \"com.apple.preference.sound\" | grep selectedOutputDevice | awk -F '\"' '{print $4}'"
    set currentOutput to do shell script outputCmd
    
    -- Get current input device
    set inputCmd to "defaults read com.apple.systempreferences.plist \"com.apple.preference.sound\" | grep selectedInputDevice | awk -F '\"' '{print $4}'"
    set currentInput to do shell script inputCmd
    
    -- Alternative using system_profiler (more consistent but more verbose output)
    set spCmd to "system_profiler SPAudioDataType | grep -A 3 'Default Output'"
    set spOutput to do shell script spCmd
    
    return "Current Audio Configuration:" & return & return & ¬
      "Output Device: " & currentOutput & return & ¬
      "Input Device: " & currentInput & return & return & ¬
      "System Profiler Details:" & return & spOutput
  on error errMsg
    return "Error getting current audio devices: " & errMsg & return & ¬
      "Note: Default approaches might not work on all macOS versions."
  end try
end getCurrentAudioDevices

-- 3. Set audio output device (shell command approach - requires switchaudio-osx)
on setAudioOutputDevice(deviceName)
  if deviceName is missing value or deviceName is "" then
    return "error: Device name not provided."
  end if
  
  try
    -- First, check if we can use switchaudio-osx (preferred method)
    set checkCmd to "which SwitchAudioSource || echo 'not installed'"
    set checkResult to do shell script checkCmd
    
    if checkResult contains "not installed" then
      -- Fallback to UI scripting if switchaudio-osx is not available
      return setAudioOutputDeviceUI(deviceName)
    else
      -- Use switchaudio-osx - reliable command-line method
      set setCmd to "SwitchAudioSource -s " & quoted form of deviceName & " -t output"
      do shell script setCmd
      return "Successfully set output device to: " & deviceName
    end if
  on error errMsg
    return "Error setting output device: " & errMsg
  end try
end setAudioOutputDevice

-- 4. UI scripting approach (fallback method)
-- Note: UI scripting is fragile and dependent on macOS version/language
on setAudioOutputDeviceUI(deviceName)
  try
    tell application "System Settings"
      activate
      delay 1 -- Give time for app to open
      
      -- Open Sound pane
      -- Note: This path may vary by macOS version
      tell application "System Events"
        click menu item "Sound" of menu "View" of menu bar 1 of application process "System Settings"
        delay 0.5
        
        -- Navigate to Output tab
        click radio button "Output" of tab group 1 of group 1 of window "Sound" of application process "System Settings"
        delay 0.5
        
        -- Find and select the desired output device
        set deviceRow to row of table 1 of scroll area 1 of group 1 of window "Sound" whose value of static text 1 contains deviceName
        select deviceRow
        delay 0.5
        
        -- Close System Settings
        keystroke "w" using {command down}
      end tell
      
      return "Set output device to: " & deviceName & " (via UI)"
    end tell
  on error errMsg
    return "Error with UI approach: " & errMsg & return & ¬
      "UI scripting is highly dependent on macOS version/language. Adjustments may be needed."
  end try
end setAudioOutputDeviceUI

-- 5. Control volume and mute state
on setOutputVolume(volumeLevel, shouldMute)
  try
    -- Set volume (0-100)
    if volumeLevel is not missing value then
      -- Convert percentage (0-100) to Apple's internal scale (0-7)
      set scaledVolume to round(volumeLevel / 14.2857)
      set volumeCmd to "osascript -e 'set volume output volume " & volumeLevel & "'"
      do shell script volumeCmd
    end if
    
    -- Set mute state if specified
    if shouldMute is not missing value then
      if shouldMute is true then
        set muteCmd to "osascript -e 'set volume output muted true'"
      else
        set muteCmd to "osascript -e 'set volume output muted false'"
      end if
      do shell script muteCmd
    end if
    
    -- Get current state
    set infoCmd to "osascript -e 'output volume of (get volume settings) & \" | Muted: \" & output muted of (get volume settings)'"
    set volumeInfo to do shell script infoCmd
    
    return "Volume settings updated:" & return & "Volume: " & volumeInfo
  on error errMsg
    return "Error setting volume: " & errMsg
  end try
end setOutputVolume

-- Example usage
set deviceList to my listAudioDevices()
set currentDevices to my getCurrentAudioDevices()
-- set outputResult to my setAudioOutputDevice("MacBook Pro Speakers")
set volumeResult to my setOutputVolume(50, false)

return deviceList & return & return & currentDevices & return & return & volumeResult
