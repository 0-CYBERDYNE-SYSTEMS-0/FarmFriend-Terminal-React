---
id: osax_choose_from_list
title: StandardAdditions: choose from list Command
description: Displays a dialog prompting the user to choose one or more items from a list.
---
set myList to {"Apple", "Banana", "Cherry", "Date", "Elderberry"}

-- Single selection
try
  set singleChoice to choose from list myList with prompt "Select your favorite fruit:" with title "Fruit Picker" default items {"Banana"}
  if singleChoice is false then
    set singleChoiceResult to "User cancelled single selection."
  else if singleChoice is {} then
    set singleChoiceResult to "User made no selection (empty selection allowed was not true)."
  else
    set singleChoiceResult to "Single choice: " & (item 1 of singleChoice)
  end if
on error errMsg number errNum
  set singleChoiceResult to "Error in single choice: " & errMsg
end try

-- Multiple selections allowed
try
  set multipleChoices to choose from list myList with prompt "Select multiple fruits:" with title "Multi-Fruit Picker" default items {"Apple", "Date"} multiple selections allowed true OK button name "Select"
  if multipleChoices is false then
    set multipleChoiceResult to "User cancelled multiple selection."
  else if multipleChoices is {} then
    set multipleChoiceResult to "User selected nothing (but clicked Select)."
  else
    set AppleScript's text item delimiters to ", "
    set multipleChoiceResult to "Multiple choices: " & (multipleChoices as string)
    set AppleScript's text item delimiters to "" -- Reset
  end if
on error errMsgTwo number errNumTwo
  set multipleChoiceResult to "Error in multiple choice: " & errMsgTwo
end try

return singleChoiceResult & "\n\n" & multipleChoiceResult
