---
id: core_datatype_string
title: Core: String Data Type
description: >-
  Working with strings (text) in AppleScript, including properties like length,
  and elements like characters, words, paragraphs.
---
set myString to "Hello, AppleScript World!"

-- Get length
set strLength to length of myString

-- Get elements
set firstChar to character 1 of myString
set firstWord to word 1 of myString
set allWords to words of myString -- returns a list

-- Concatenation
set greeting to "Greetings: " & myString

-- Coercion
set numAsString to "123"
set myNum to numAsString as integer

return "Length: " & strLength & "\\nFirst Char: " & firstChar & "\\nFirst Word: " & firstWord & "\\nGreeting: " & greeting & "\\nNumber: " & myNum
