---
id: osax_offset_of_in
title: StandardAdditions: offset of...in Command
description: Finds the position of a substring within a string or an item within a list.
---
-- Example 1: Finding substring positions in text
set sampleText to "AppleScript is a powerful scripting language for macOS."
set searchTerm to "script" -- {searchTerm}

try
  -- Find first occurrence (case-sensitive by default)
  set firstPos to offset of searchTerm in sampleText
  
  -- Find with starting position specified
  set secondPos to offset of searchTerm in sampleText from character (firstPos + 1)
  
  -- Find with case insensitivity
  considering case
    set caseSensitivePos to offset of searchTerm in sampleText
  end considering
  
  ignoring case
    set caseInsensitivePos to offset of searchTerm in sampleText
  end ignoring
  
  -- Example 2: Finding an item in a list
  set fruitList to {"apple", "banana", "cherry", "dates", "elderberry"}
  set listItem to "cherry"
  set itemPosition to offset of listItem in fruitList
  
  -- Build result string
  set resultText to "Search results for '" & searchTerm & "':\n" & ¬
    "- First position: " & firstPos & "\n" & ¬
    "- Second position: " & (if secondPos = 0 then "Not found" else secondPos as text) & "\n" & ¬
    "- Case-sensitive position: " & caseSensitivePos & "\n" & ¬
    "- Case-insensitive position: " & caseInsensitivePos & "\n\n" & ¬
    "Position of '" & listItem & "' in fruit list: " & itemPosition
    
  return resultText
on error errMsg
  return "Error: " & errMsg
end try
