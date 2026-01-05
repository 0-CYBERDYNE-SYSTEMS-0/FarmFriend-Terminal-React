---
id: shell_list_directory_ls
title: Shell: List Directory Contents (ls -la)
description: >-
  Uses 'do shell script' with 'ls -la' to get a detailed listing of a
  directory's contents.
---
{dirPath}

on listDirectoryDetailed(posixDirPath)
  if posixDirPath is missing value or posixDirPath is "" then
    return "error: Directory path not provided."
  end if
  
  try
    -- Ensure the path is expanded (e.g. ~) and quoted for the shell
    set expandedPath to do shell script "echo " & quoted form of posixDirPath
    
    -- Check if directory exists
    set checkCmd to "test -d " & quoted form of expandedPath & " && echo 'exists' || echo 'not exists'"
    set dirExists to do shell script checkCmd
    
    if dirExists is "not exists" then
      return "error: Directory does not exist at path: " & posixDirPath
    end if
    
    -- Get and return directory listing
    return do shell script "ls -la " & quoted form of expandedPath
  on error errMsg
    return "error: Failed to list directory '" & posixDirPath & "': " & errMsg
  end try
end listDirectoryDetailed

return my listDirectoryDetailed("{dirPath}")
