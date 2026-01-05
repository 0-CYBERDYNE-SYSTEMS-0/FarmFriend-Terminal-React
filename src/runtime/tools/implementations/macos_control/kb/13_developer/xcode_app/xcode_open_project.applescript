---
id: xcode_open_project
title: Xcode: Open Project or Workspace
description: Opens an Xcode project or workspace file.
---
{projectPath}

on openXcodeProject(projectPath)
  if projectPath is missing value or projectPath is "" then
    return "error: Project path not provided."
  end if
  
  if not (projectPath ends with ".xcodeproj" or projectPath ends with ".xcworkspace") then
    return "error: Path must be an Xcode project (.xcodeproj) or workspace (.xcworkspace) file."
  end if
  
  try
    tell application "Xcode"
      open projectPath
      activate
      
      -- Wait for project to open
      delay 1
      
      return "Successfully opened project: " & projectPath
    end tell
  on error errMsg number errNum
    return "error (" & errNum & ") opening Xcode project: " & errMsg
  end try
end openXcodeProject

return my openXcodeProject("{projectPath}")
