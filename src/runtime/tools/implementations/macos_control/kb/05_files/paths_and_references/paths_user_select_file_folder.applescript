---
id: paths_user_select_file_folder
title: Paths: User Selects File or Folder
description: >-
  Uses 'choose file', 'choose folder', and 'choose file name' (for saving) to
  get path input from the user via standard dialogs.
---
try
  -- Choose an existing file
  set chosenFile to choose file with prompt "Please choose a file to process:"
  set chosenFilePath to POSIX path of chosenFile
  
  -- Choose an existing folder
  set chosenFolder to choose folder with prompt "Please select a destination folder:"
  set chosenFolderPath to POSIX path of chosenFolder
  
  -- Choose a name and location for a new file to be saved
  set newFileName to choose file name with prompt "Save new data as:" default name "output.txt" default location (path to desktop)
  set newFilePOSIXPath to POSIX path of newFileName
  
  set output to "Chosen file: " & chosenFilePath & "\\n"
  set output to output & "Chosen folder: " & chosenFolderPath & "\\n"
  set output to output & "New file location: " & newFilePOSIXPath
  return output
  
on error errMsg number errNum
  if errNum is -128 then -- User cancelled
    return "User cancelled selection."
  else
    return "Error during selection: " & errMsg
  end if
end try
