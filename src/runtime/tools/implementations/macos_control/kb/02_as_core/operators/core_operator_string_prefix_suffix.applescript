---
id: core_operator_string_prefix_suffix
title: Core: String Prefix/Suffix Operators
description: Covers string operators like ''starts with'', ''ends with'', and their negations.
---
set myString to "AppleScript Language Guide"

-- Basic checks
set startsWithApple to myString starts with "Apple"   -- true
set endsWithGuide to myString ends with "Guide"     -- true
set startsWithScript to myString starts with "Script" -- false
set endsWithLang to myString ends with "Lang"       -- false

-- Negations
set notStartsWithX to myString does not start with "Xojo" -- true
set notEndsWithY to myString does not end with "Java"   -- true

-- Case sensitivity
set lowerString to "applescript language guide"
set startsWithAppleLower to lowerString starts with "Apple" -- true (default is case-insensitive)

considering case
  set startsWithAppleCaseSens to lowerString starts with "Apple" -- false (case-sensitive)
  set endsWithGuideCaseSens to lowerString ends with "guide"     -- true (case-sensitive)
end considering

return "Starts with Apple: " & startsWithApple & ¬
  "\nEnds with Guide: " & endsWithGuide & ¬
  "\nNot starts with Xojo: " & notStartsWithX & ¬
  "\nStarts with Apple (lower, default): " & startsWithAppleLower & ¬
  "\nStarts with Apple (lower, case-sensitive): " & startsWithAppleCaseSens & ¬
  "\nEnds with guide (lower, case-sensitive): " & endsWithGuideCaseSens
