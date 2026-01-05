---
id: osax_time_to_gmt
title: StandardAdditions: time to GMT Command
description: >-
  Returns the difference in seconds between the computer's local time zone and
  Greenwich Mean Time (GMT)/Coordinated Universal Time (UTC).
---
set gmtOffsetInSeconds to time to GMT
set gmtOffsetInHours to gmtOffsetInSeconds / (60 * 60)

return "Offset from GMT: " & gmtOffsetInSeconds & " seconds (" & gmtOffsetInHours & " hours)."
