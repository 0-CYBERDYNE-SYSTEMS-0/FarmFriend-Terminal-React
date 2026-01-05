---
id: osax_choose_url
title: StandardAdditions: choose URL Command
description: >-
  Displays a dialog for the user to enter or select a URL. Returns the entered
  URL as text.
---
set chosenURL to ""
try
  -- Choose a URL, showing HTTP/HTTPS field by default
  set urlResult to choose URL with prompt "Enter the website URL:" with title "Website Chooser"
  if urlResult is not false then
    set chosenURL to "URL: " & urlResult
  else
    set chosenURL to "User cancelled URL input."
  end if
  
  -- Choose a File URL
  set fileURLResult to choose URL showing File with prompt "Select a local file to get its URL:" with title "File URL Chooser"
  if fileURLResult is not false then
    set chosenURL to chosenURL & "\nFile URL: " & fileURLResult
  else
    set chosenURL to chosenURL & "\nUser cancelled File URL input."
  end if
  
on error errMsg number errNum
  if errNum is -128 then
    set chosenURL to chosenURL & "\nUser cancelled a dialog (-128)."
  else
    set chosenURL to chosenURL & "\nError (" & errNum & "): " & errMsg
  end if
end try

return chosenURL
