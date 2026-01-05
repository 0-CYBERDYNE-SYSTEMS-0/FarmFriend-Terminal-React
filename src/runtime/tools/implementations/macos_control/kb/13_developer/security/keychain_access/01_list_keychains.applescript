---
id: keychain_list_keychains
title: Keychain Access: List Available Keychains
description: >-
  Lists all available keychains on the system using the security command-line
  tool.
---
try
  -- List all available keychains
  set keychainListCmd to "security list-keychains"
  set keychainOutput to do shell script keychainListCmd
  
  -- Process the raw output into a more readable format
  set keychainLines to paragraphs of keychainOutput
  set keychainList to {}
  
  repeat with keyLine in keychainLines
    if keyLine is not "" then
      -- Extract keychain path from quotes
      if keyLine contains "\"" then
        set quotedPath to text from ((offset of "\"" in keyLine) + 1) to -2 of keyLine
        set end of keychainList to quotedPath
      else
        set end of keychainList to keyLine
      end if
    end if
  end repeat
  
  -- Get the default keychain
  set defaultKeychainCmd to "security default-keychain"
  set defaultKeychainOutput to do shell script defaultKeychainCmd
  set defaultKeychain to text from ((offset of "\"" in defaultKeychainOutput) + 1) to -2 of defaultKeychainOutput
  
  -- Format the result as a readable string
  set resultText to "Available Keychains:" & return
  set resultText to resultText & "================" & return
  
  repeat with kcPath in keychainList
    set keychainName to last text item of kcPath delimited by "/"
    if kcPath is equal to defaultKeychain then
      set resultText to resultText & "* " & keychainName & " (Default)" & return
    else
      set resultText to resultText & "• " & keychainName & return
    end if
    set resultText to resultText & "  Path: " & kcPath & return
  end repeat
  
  set resultText to resultText & return & "Default Keychain: " & defaultKeychain
  return resultText
on error errMsg
  return "Error listing keychains: " & errMsg
end try
