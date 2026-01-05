---
id: paths_posix_vs_hfs
title: Paths: Understanding POSIX and HFS+ Paths
description: >-
  Explains the difference between POSIX (slash-separated) and HFS+
  (colon-separated) paths in AppleScript and how to convert between them.
---
-- Example: POSIX to AppleScript file object then back to POSIX path
set myPOSIXPath to "/Applications/Calculator.app"
set myASFileObject to POSIX file myPOSIXPath

-- myASFileObject is now something like: file "Macintosh HD:Applications:Calculator.app"
-- or alias "Macintosh HD:Applications:Calculator.app" depending on context

set retrievedPOSIXPath to POSIX path of myASFileObject
-- retrievedPOSIXPath is now "/Applications/Calculator.app"

-- Example: HFS path string to POSIX path
set userName to do shell script "whoami"
set myHFSPathString to "Macintosh HD:Users:" & userName & ":Desktop:"
set desktopPOSIXPath to POSIX path of myHFSPathString

return "AS File Object: " & (myASFileObject as text) & "\\nRetrieved POSIX: " & retrievedPOSIXPath & "\\nDesktop POSIX: " & desktopPOSIXPath
