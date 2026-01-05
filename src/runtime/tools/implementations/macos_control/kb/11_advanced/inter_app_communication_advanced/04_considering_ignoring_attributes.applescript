---
id: advanced_considering_ignoring_attributes
title: Advanced: ''considering/ignoring attributes'' Block
description: >-
  Explains how the 'considering' and 'ignoring' blocks modify AppleScript's
  string comparison behavior for attributes like case, white space, punctuation,
  etc.
---
set string1 to "Hello World!"
set string2 to "hello world"
set string3 to "HelloWorld"
set string4 to "Item 2"
set string5 to "Item 10"
set string6 to "résumé"
set string7 to "resume"

set results to {}

-- Default comparison (usually ignores case, punctuation, and leading/trailing whitespace)
set end of results to "Default: '" & string1 & "' = '" & string2 & "' is " & (string1 = string2) -- Usually true
set end of results to "Default: '" & string1 & "' = '" & string3 & "' is " & (string1 = string3) -- Usually false

-- Considering case
considering case
  set end of results to "Considering case: '" & string1 & "' = '" & string2 & "' is " & (string1 = string2) -- false
end considering

-- Ignoring white space (in addition to default ignores)
ignoring white space
  set end of results to "Ignoring white space: '" & string1 & "' = '" & string3 & "' is " & (string1 = string3) -- true
end ignoring

-- Considering punctuation (default usually ignores it for basic =)
-- but for 'contains', 'starts with', 'ends with', punctuation is usually considered.
considering punctuation
  set end of results to "Considering punctuation: '" & string1 & "' contains '!' is " & (string1 contains "!") -- true
end considering
ignoring punctuation
  set end of results to "Ignoring punctuation: '" & string1 & "' contains '!' is " & (string1 contains "!") -- This might still be true if 'contains' inherently checks for the character. Let's test equality.
  set end of results to "Ignoring punctuation: '" & string1 & "' = 'Hello World' is " & (string1 = "Hello World") -- true
end ignoring

-- Considering numeric strings
-- Default: "Item 10" comes before "Item 2" lexicographically
set end of results to "Default: '" & string4 & "' < '" & string5 & "' is " & (string4 < string5) -- false

considering numeric strings
  set end of results to "Considering numeric strings: '" & string4 & "' < '" & string5 & "' is " & (string4 < string5) -- true
end considering

-- Considering diacriticals
set end of results to "Default: '" & string6 & "' = '" & string7 & "' is " & (string6 = string7) -- Often true (ignores diacritics by default)

considering diacriticals
  set end of results to "Considering diacriticals: '" & string6 & "' = '" & string7 & "' is " & (string6 = string7) -- false
end considering

-- Combining considering and ignoring
considering case but ignoring white space
  set end of results to "Considering case, ignoring white space: 'Hello World' = 'HelloWorld' is " & ("Hello World" = "HelloWorld") -- false
  set end of results to "Considering case, ignoring white space: 'HelloWorld' = 'HelloWorld' is " & ("HelloWorld" = "HelloWorld") -- true
end considering

set output to ""
repeat with res in results
  set output to output & res & "\n"
end repeat

return output
