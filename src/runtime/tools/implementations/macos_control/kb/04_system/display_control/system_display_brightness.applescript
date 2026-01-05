---
id: system_display_brightness
title: System Display Brightness Control
description: Controls the brightness of the Mac's built-in display with precise increments
---
-- Method 1: Using System Events keyboard shortcuts
tell application "System Events"
  -- Increase brightness (simulate F2 key)
  key code 144
  
  -- Decrease brightness (simulate F1 key)
  key code 145
end tell

-- Method 2: Using brightness adjustment in small increments
-- Set brightness to a specific level (0-100%)
on setBrightness(brightnessLevel)
  set brightnessLevel to brightnessLevel as number
  if brightnessLevel < 0 then set brightnessLevel to 0
  if brightnessLevel > 100 then set brightnessLevel to 100
  
  do shell script "brightness " & brightnessLevel / 100
end setBrightness

-- Increase brightness by 10%
on increaseBrightness()
  set currentBrightness to (do shell script "brightness -l | grep brightness | awk '{print $4}'") as number
  set newBrightness to currentBrightness + 0.1
  if newBrightness > 1 then set newBrightness to 1
  do shell script "brightness " & newBrightness
end increaseBrightness

-- Decrease brightness by 10%
on decreaseBrightness()
  set currentBrightness to (do shell script "brightness -l | grep brightness | awk '{print $4}'") as number
  set newBrightness to currentBrightness - 0.1
  if newBrightness < 0 then set newBrightness to 0
  do shell script "brightness " & newBrightness
end decreaseBrightness

-- Method 3: Alternative approach with `brightness` CLI tool (if installed)
-- Note: This requires the `brightness` command-line tool to be installed
-- Install with: brew install brightness

-- Example: Set brightness to 50%
setBrightness(50)

-- Example: Increase brightness by one step
increaseBrightness()

-- Example: Decrease brightness by one step
decreaseBrightness()
