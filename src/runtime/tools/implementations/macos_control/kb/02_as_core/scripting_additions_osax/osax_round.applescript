---
id: osax_round
title: StandardAdditions: round Command
description: >-
  Rounds a number to the nearest integer, with options for rounding direction
  (up, down, toward zero, to nearest).
---
-- Round to nearest (default behavior)
set num1 to 2.3
set rounded1 to round num1 -- Result: 2

set num2 to 2.7
set rounded2 to round num2 -- Result: 3

set num3 to 2.5
set rounded3_default to round num3 -- Result: 2 (rounds to nearest even for .5)

-- Rounding directions
set num4 to 3.5
set rounded_up to round num4 rounding up -- Result: 4
set rounded_down to round num4 rounding down -- Result: 3 (truncates)
set rounded_to_zero to round num4 rounding toward zero -- Result: 3
set rounded_nearest to round num4 rounding to nearest -- Result: 4 (rounds to nearest even for .5)
set rounded_school to round num4 rounding as taught in school -- Result: 4 (rounds .5 up)

set num5 to -3.5
set rounded_up_neg to round num5 rounding up -- Result: -3
set rounded_down_neg to round num5 rounding down -- Result: -4
set rounded_to_zero_neg to round num5 rounding toward zero -- Result: -3
set rounded_nearest_neg to round num5 rounding to nearest -- Result: -4 (rounds to nearest even for .5)
set rounded_school_neg to round num5 rounding as taught in school -- Result: -3 (rounds .5 up, away from zero for negative)

return "2.3 rounded: " & rounded1 & ¬
  "\n2.7 rounded: " & rounded2 & ¬
  "\n2.5 rounded (default/to nearest): " & rounded3_default & ¬
  "\n3.5 rounded up: " & rounded_up & ¬
  "\n3.5 rounded down: " & rounded_down & ¬
  "\n3.5 rounded toward zero: " & rounded_to_zero & ¬
  "\n3.5 rounded to nearest: " & rounded_nearest & ¬
  "\n3.5 rounded as taught in school: " & rounded_school & ¬
  "\n-3.5 rounded up: " & rounded_up_neg & ¬
  "\n-3.5 rounded down: " & rounded_down_neg & ¬
  "\n-3.5 rounded toward zero: " & rounded_to_zero_neg & ¬
  "\n-3.5 rounded to nearest: " & rounded_nearest_neg & ¬
  "\n-3.5 rounded as taught in school: " & rounded_school_neg
