---
id: osax/choose/file
title: Choose File Dialog
description: Displays a file selection dialog to allow the user to select a file
---
-- Basic file selection
set selectedFile to choose file with prompt "Please select a file"
return "You selected: " & (POSIX path of selectedFile)

-- More options
set selectedFile to choose file with prompt "Please select a file" ¬
    of type {"txt", "md", "rtf"} ¬
    default location (path to desktop folder) ¬
    with invisibles ¬
    with multiple selections allowed

-- Handle the result (may be a list if multiple selections allowed)
if class of selectedFile is list then
    set fileList to {}
    repeat with oneFile in selectedFile
        set end of fileList to POSIX path of oneFile
    end repeat
    return "You selected multiple files: " & fileList
else
    return "You selected: " & (POSIX path of selectedFile)
end if
