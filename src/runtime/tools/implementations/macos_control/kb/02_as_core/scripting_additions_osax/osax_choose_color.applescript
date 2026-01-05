---
id: osax_choose_color
title: StandardAdditions: choose color Command
description: >-
  Displays the standard macOS color picker dialog and returns the selected color
  as an RGB list.
---
try
  -- Choose color with a default (e.g., a light blue)
  set chosenColorRGB to choose color default color {30000, 45000, 60000} -- R, G, B values (0-65535)
  
  set redValue to item 1 of chosenColorRGB
  set greenValue to item 2 of chosenColorRGB
  set blueValue to item 3 of chosenColorRGB
  
  set resultMessage to "Chosen color (RGB 0-65535): {" & redValue & ", " & greenValue & ", " & blueValue & "}"
  
  -- Convert to RGB 0-255 for common usage (approximate)
  set red255 to round (redValue / 65535 * 255) without rounding
  set green255 to round (greenValue / 65535 * 255) without rounding
  set blue255 to round (blueValue / 65535 * 255) without rounding
  
  set resultMessage to resultMessage & "\nApprox. RGB (0-255): {" & red255 & ", " & green255 & ", " & blue255 & "}"
  
on error errMsg number errNum
  if errNum is -128 then
    set resultMessage to "User cancelled color selection."
  else
    set resultMessage to "Error (" & errNum & "): " & errMsg
  end if
end try

return resultMessage
