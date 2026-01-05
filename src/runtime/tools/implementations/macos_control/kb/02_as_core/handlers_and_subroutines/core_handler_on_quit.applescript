---
id: core_handler_on_quit
title: Core: Stay-Open Applet Handler ''on quit''
description: >-
  Defines a handler that executes when a stay-open applet is commanded to quit,
  allowing for cleanup operations.
---
-- This script, saved as a stay-open applet, demonstrates the on quit handler.

property dataToSave : "Some important data"

on run
  log "Applet started. Data: " & dataToSave
  -- The applet will now stay open, doing nothing until quit
end run

on idle
  -- A minimal idle handler to keep it alive if needed, or just rely on run + stay open
  return 300 -- Check every 5 minutes, effectively just keeping it open
end idle

on quit
  log "'on quit' handler called."
  -- Simulate saving data or cleanup
  set dataToSave to "Data has been processed and saved."
  log "Clean up complete. Final data state: " & dataToSave
  
  -- Display a dialog (optional, mainly for demonstration)
  -- In a real applet, you might write to a file or log silently.
  try
    display dialog "Applet is quitting. Cleanup performed." buttons {"OK"} default button "OK" with icon note giving up after 5
  on error number -1712 -- dialog timed out
    log "Quit dialog timed out."
  end try
  
  continue quit -- THIS IS ESSENTIAL to allow the applet to actually quit.
end quit

-- To test:
-- 1. Save this script as an Application (e.g., "StayOpenTest.app") with "Stay open after run handler" checked.
-- 2. Run the applet.
-- 3. Quit the applet (e.g., from its Dock icon, or Cmd-Q if it's frontmost).
-- 4. Check the Script Editor log for messages from `on run` and `on quit`.
