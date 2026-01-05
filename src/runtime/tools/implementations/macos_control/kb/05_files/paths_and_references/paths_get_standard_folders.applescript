---
id: paths_get_standard_folders
title: Paths: Get Path to Standard Folders
description: >-
  Uses AppleScript's 'path to' command to reliably get paths to standard macOS
  folders like Desktop, Documents, Application Support, etc., for different
  domains.
---
-- Get POSIX path to the current user's Desktop folder
set desktopPathAlias to path to desktop folder from user domain
set desktopPOSIX to POSIX path of desktopPathAlias

-- Get POSIX path to the system-wide Application Support folder
set appSupportLocalPathAlias to path to application support from local domain
set appSupportLocalPOSIX to POSIX path of appSupportLocalPathAlias

-- Get path to the frontmost application's bundle (if it's a standard app)
try
  set frontAppPathAlias to path to frontmost application
  set frontAppPOSIX to POSIX path of frontAppPathAlias
on error
  set frontAppPOSIX to "N/A (frontmost app might not have a standard path)"
end try

return "User Desktop: " & desktopPOSIX & "\\nLocal App Support: " & appSupportLocalPOSIX & "\\nFront App: " & frontAppPOSIX
