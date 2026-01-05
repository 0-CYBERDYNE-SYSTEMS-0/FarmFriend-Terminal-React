---
id: xcode_build_project_shell
title: Xcode: Build Project via xcodebuild Shell Command
description: Builds an Xcode project or workspace using the 'xcodebuild' command-line tool.
---
{projectPath}
{schemeName}
{configName}

on buildXcodeProject(theProjectPath, theSchemeName, theConfigName)
  if theProjectPath is missing value or theProjectPath is "" then return "error: Project path not provided."
  if theSchemeName is missing value or theSchemeName is "" then return "error: Scheme name not provided."

  set projectOrWorkspaceFlag to "-project"
  if theProjectPath ends with ".xcworkspace" then
    set projectOrWorkspaceFlag to "-workspace"
  end if
  
  set command to "xcodebuild " & projectOrWorkspaceFlag & " " & quoted form of theProjectPath & ¬
    " -scheme " & quoted form of theSchemeName
    
  if theConfigName is not missing value and theConfigName is not "" then
    set command to command & " -configuration " & quoted form of theConfigName
  end if
  
  set command to command & " build" -- Or "clean build", "archive", etc.
  
  try
    -- Change to project directory first if build requires relative paths
    -- Extract directory path from the project path directly
    set projectDir to do shell script "dirname " & quoted form of theProjectPath
    return do shell script "cd " & quoted form of projectDir & " && " & command
  on error errMsg number errNum
    return "error (" & errNum & ") building Xcode project: " & errMsg
  end try
end buildXcodeProject

return my buildXcodeProject("{projectPath}", "{schemeName}", "{configName}")
