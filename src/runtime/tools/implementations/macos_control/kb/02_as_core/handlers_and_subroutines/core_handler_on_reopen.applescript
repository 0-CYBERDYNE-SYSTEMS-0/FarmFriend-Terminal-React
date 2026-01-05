---
id: core_handler_on_reopen
title: Core: Stay-Open Applet Handler ''on reopen''
description: >-
  Defines a handler that executes when a running stay-open applet is reactivated
  (e.g., by clicking its Dock icon or opening it again from Finder).
---
-- This script, saved as a stay-open applet, demonstrates the on reopen handler.

property openCount : 0

on run
  set openCount to 1
  log "Applet started for the first time."
  displayReopenStatus()
end run

on idle
  return 300 -- Keep applet alive
end idle

on reopen
  log "Applet reopened."
  set openCount to openCount + 1
  activate -- Bring the applet to the front
  displayReopenStatus()
end reopen

on quit
  log "Applet quitting."
  continue quit
end quit


-- A custom handler to show status
on displayReopenStatus()
  try
    if openCount = 1 then
      display dialog "Applet is running. This is the initial launch." with title "Applet Status" buttons {"OK"} default button "OK" giving up after 10
    else
      display dialog "Applet has been reopened " & (openCount - 1) & " times." with title "Applet Status" buttons {"OK"} default button "OK" giving up after 10
    end if
  on error number -1712 -- dialog timed out
    log "Status dialog timed out."
  end try
end displayReopenStatus

-- To test:
-- 1. Save this script as an Application (e.g., "ReopenTest.app") with "Stay open after run handler" checked.
-- 2. Run the applet. Observe the first dialog.
-- 3. Click the applet's icon in the Dock, or double-click it in Finder. Observe the updated dialog.
-- 4. Repeat step 3.
