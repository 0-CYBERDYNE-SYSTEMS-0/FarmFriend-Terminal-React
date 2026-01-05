---
id: fileops_read_text_file
title: File Ops (No Finder): Read Text File Content
description: >-
  Reads the entire content of a specified text file using StandardAdditions.
  Returns content as a string.
---
{filePath}

on readFileContent(posixPath)
  if posixPath is missing value or posixPath is "" then
    return "error: File path not provided."
  end if

  try
    set fileAlias to POSIX file posixPath as alias
    set fileContent to read fileAlias as «class utf8» -- Or 'as text' for default system encoding
    return fileContent
  on error errMsg number errNum
    return "error: (" & errNum & ") Failed to read file '" & posixPath & "': " & errMsg
  end try
end readFileContent

return my readFileContent("{filePath}")
