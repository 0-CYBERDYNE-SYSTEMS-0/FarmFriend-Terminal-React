---
id: osax_delay
title: StandardAdditions: delay Command
description: Pauses script execution for a specified number of seconds.
---
log "Script started at: " & (time string of (current date))

delay 2 -- Pause for 2 seconds

log "Script resumed after 2 seconds at: " & (time string of (current date))

delay 0.5 -- Pause for half a second

set finalTime to time string of (current date)
log "Script finished after additional 0.5s delay at: " & finalTime

return "Script execution paused and resumed. Final log time: " & finalTime
