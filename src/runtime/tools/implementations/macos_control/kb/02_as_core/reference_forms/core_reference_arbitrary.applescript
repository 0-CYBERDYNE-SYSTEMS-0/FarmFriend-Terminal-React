---
id: core_reference_arbitrary
title: Core: Arbitrary Element Reference Form (''some'')
description: >-
  Accessing an arbitrary or random element from a collection using 'some
  element'.
---
-- List example
set myOptions to {"Option A", "Option B", "Option C", "Option D"}
if (count of myOptions) > 0 then
  set randomOption to some item of myOptions
else
  set randomOption to "(List is empty)"
end if

-- String example (less common, but works for characters/words/paragraphs)
set mySentence to "Pick any word from this sentence."
if mySentence is not "" then
  set randomWord to some word of mySentence
else
  set randomWord to "(String is empty)"
end if

-- Finder example: Get some file from the Desktop
set randomFileOnDesktop to "(Finder example not run by default or Desktop empty)"
(*
tell application "Finder"
  try
    if (count of files of desktop) > 0 then
      set aFile to some file of desktop
      set randomFileOnDesktop to name of aFile
    else
      set randomFileOnDesktop to "No files on Desktop to pick from."
    end if
  on error errMsg
    set randomFileOnDesktop to "Finder error: " & errMsg
  end try
end tell
*)

-- Error handling for empty collection
set emptyList to {}
set emptyPickError to "No error yet."
try
  set failedPick to some item of emptyList
on error errMsg
  set emptyPickError to "Error picking from empty list: " & errMsg
end try

return "Random option: " & randomOption & ¬
  "\nRandom word: " & randomWord & ¬
  "\nRandom Desktop file: " & randomFileOnDesktop & ¬
  "\nError from empty list: " & emptyPickError
