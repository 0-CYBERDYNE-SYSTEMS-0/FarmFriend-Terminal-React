---
id: system_volume_control_manager
title: System Volume Control
description: Controls system audio output volume with precise increments and mute toggling
---
-- Get the current volume settings
set currentSettings to get volume settings

-- Set volume to specified percentage (0-100)
-- Example: 50% volume
set volume output volume 50

-- Mute the output
set volume with output muted

-- Unmute the output (keeping the previous volume level)
set volume without output muted

-- Increase volume by 10%
set currentVolume to output volume of currentSettings
if currentVolume <= 90 then
  set volume output volume (currentVolume + 10)
else
  set volume output volume 100
end if

-- Decrease volume by 10%
set currentVolume to output volume of currentSettings
if currentVolume >= 10 then
  set volume output volume (currentVolume - 10)
else
  set volume output volume 0
end if

-- Toggle mute state
set isMuted to output muted of currentSettings
if isMuted then
  set volume without output muted
else
  set volume with output muted
end if
