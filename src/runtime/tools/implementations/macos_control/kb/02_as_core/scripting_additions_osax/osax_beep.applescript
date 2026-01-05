---
id: osax_beep
title: StandardAdditions: beep Command
description: Plays the system alert sound. Can specify the number of beeps.
---
-- Play one beep (default)
-- beep

-- Play three beeps
try
  beep 3
  set beepResult to "Played 3 beeps (if sound is on)."
on error errMsg
  set beepResult to "Error beeping: " & errMsg
end try

-- Note: The actual sound played depends on the System Preferences > Sound > Sound Effects settings.
-- This script doesn't return a value other than what's explicitly constructed here.

return beepResult & " (The 'beep' command itself doesn't return a value. Commented out single beep to avoid double beeping on run if uncommented.)"
