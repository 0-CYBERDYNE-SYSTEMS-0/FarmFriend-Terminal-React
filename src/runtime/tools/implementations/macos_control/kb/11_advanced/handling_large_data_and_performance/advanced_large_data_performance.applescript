---
id: advanced_large_data_performance
title: Advanced: Handling Large Data & Performance Tips
description: >-
  Strategies for dealing with large lists, text, or many iterations to improve
  AppleScript performance.
---
-- Example: Efficiently getting names from Finder (bulk vs. loop)

{targetFolderAlias}

on getFinderItemNames(folderAlias)
  if folderAlias is missing value then
    try
      set folderAlias to (choose folder with prompt "Select a folder for performance test:")
    on error
      return "User cancelled folder selection."
    end try
  end if
  
  set results to ""
  
  -- Potentially SLOW for very large folders:
  set startTimeSlow to current date
  set itemNamesSlow to {}
  tell application "Finder"
    try
      set allItems to items of folderAlias
      repeat with anItem in allItems
        set end of itemNamesSlow to name of anItem
      end repeat
      set timeTakenSlow to (current date) - startTimeSlow
      set results to results & "Slow method (looping) item count: " & (count of itemNamesSlow) & ", time: " & timeTakenSlow & " seconds.\n"
    on error errMsg
      set results to results & "Error in slow method: " & errMsg & "\n"
    end try
  end tell
  
  -- Generally FASTER for very large folders:
  set startTimeFast to current date
  set itemNamesFast to {}
  tell application "Finder"
    try
      set itemNamesFast to name of items of folderAlias
      set timeTakenFast to (current date) - startTimeFast
      set results to results & "Fast method (bulk get) item count: " & (count of itemNamesFast) & ", time: " & timeTakenFast & " seconds.\n"
    on error errMsg
      set results to results & "Error in fast method: " & errMsg & "\n"
    end try
  end tell
  
  if (count of itemNamesSlow) > 0 and (count of itemNamesSlow) < 20 then
    set results to results & "Slow names: " & itemNamesSlow & "\n"
  end if
  if (count of itemNamesFast) > 0 and (count of itemNamesFast) < 20 then
    set results to results & "Fast names: " & itemNamesFast & "\n"
  end if
  
  return results
end getFinderItemNames

return my getFinderItemNames(missing value) -- Pass missing value or a pre-defined alias for testing

-- To use with MCP_INPUT:targetFolderAlias (which would be a POSIX path string)
(*
set mcpFolderAlias to missing value
set mcpInputPath to "{targetFolderAlias}"
if mcpInputPath is not missing value and mcpInputPath is not "" and mcpInputPath is not "{targetFolderAlias}" then
  try
    set mcpFolderAlias to POSIX file mcpInputPath as alias
  on error
     return "Error: MCP_INPUT:targetFolderAlias is not a valid path: " & mcpInputPath
  end try
else
  return "Error: MCP_INPUT:targetFolderAlias not provided or is placeholder."
end if
return my getFinderItemNames(mcpFolderAlias)
*)
