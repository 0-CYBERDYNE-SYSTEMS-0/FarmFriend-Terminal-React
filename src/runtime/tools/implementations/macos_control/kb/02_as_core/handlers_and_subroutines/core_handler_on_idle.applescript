---
id: core_handler_on_idle
title: Core: Stay-Open Applet Handler ''on idle''
description: >-
  Defines a handler that executes periodically if the script is saved as a 'Stay
  Open' application. Returning a number sets the next idle interval in seconds.
---
-- This stay-open applet will display the current time every 10 seconds.

property lastTimeDisplayed : ""

on idle
  set currentTimeString to time string of (current date)
  if currentTimeString is not lastTimeDisplayed then
    -- display notification currentTimeString with title "Idle Check" -- Can be annoying
    log "Idle tick: " & currentTimeString -- Check Script Editor log
    set lastTimeDisplayed to currentTimeString
  end if
  return 10 -- Check again in 10 seconds
end idle

-- Optional: on run handler is executed once when the applet first launches
on run
  log "Stay-open applet started. Idle handler will run periodically."
  -- Perform initial setup if any
end run

-- Optional: on quit handler for cleanup when the applet is quit
on quit
  log "Stay-open applet quitting."
  -- Perform cleanup
  continue quit -- Allow the applet to actually quit
end quit
