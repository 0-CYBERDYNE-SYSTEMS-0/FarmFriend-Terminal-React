---
id: osax_info_for
title: StandardAdditions: info for Command
description: Retrieves a record of metadata about a specified file or folder alias.
---
try
  set targetFile to choose file with prompt "Select a file to get info for:"
  
  set fileInfo to info for targetFile
  
  set output to "File Info for: " & (name of fileInfo) & "\\n"
  set output to output & "  Kind: " & (kind of fileInfo) & "\\n"
  set output to output & "  Size: " & (size of fileInfo) & " bytes\\n"
  set output to output & "  Creation Date: " & (creation date of fileInfo as string) & "\\n"
  set output to output & "  Modification Date: " & (modification date of fileInfo as string) & "\\n"
  set output to output & "  Visible: " & (visible of fileInfo) & "\\n"
  set output to output & "  Locked: " & (locked of fileInfo) & "\\n"
  try
    set output to output & "  Default Application: " & (POSIX path of (default application of fileInfo)) & "\\n"
  on error
    set output to output & "  Default Application: Not set or not an alias\\n"
  end try
  
  return output
  
on error errMsg number errNum
  if errNum is -128 then return "User cancelled."
  return "Error getting file info (" & errNum & "): " & errMsg
end try
