---
id: osax_path_to
title: StandardAdditions: path to Command
description: >-
  Returns an alias to a special system or user folder (e.g., desktop, documents,
  applications folder, etc.).
---
-- Path to current user's Desktop
set userDesktopAlias to path to desktop folder from user domain
set userDesktopPOSIX to POSIX path of userDesktopAlias

-- Path to the main Applications folder
set localApplicationsAlias to path to applications folder from local domain
set localApplicationsPOSIX to POSIX path of localApplicationsAlias

-- Path to temporary items folder (good for temp files)
set tempFolderAlias to path to temporary items from user domain
set tempFolderPOSIX to POSIX path of tempFolderAlias

return "User Desktop: " & userDesktopPOSIX & "\\nLocal Applications: " & localApplicationsPOSIX & "\\nTemp Folder: " & tempFolderPOSIX
