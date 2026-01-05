---
id: core_datatype_constant
title: AppleScript Constants: The ''constant'' Data Type
description: >-
  Explains AppleScript's 'constant' data type, which represents named constant
  values used by applications.
---
-- Example of application constants
tell application "Finder"
  -- File sorting constants
  set nameSort to name column -- Returns constant value: 'name'
  set sizeSort to size column -- Returns constant value: 'size'
  set dateSort to modification date column -- Returns constant value: 'modd'
  
  -- View mode constants
  set listViewMode to list view -- Returns constant value: 'clvw'
  set iconViewMode to icon view -- Returns constant value: 'icnv'
  set columnViewMode to column view -- Returns constant value: 'clvw'
  
  -- Using constants as parameters
  -- Set the front Finder window to list view
  if (count of Finder windows) > 0 then
    set current view of front Finder window to list view
  end if
end tell

-- AppleScript's built-in constants
set mondayConstant to Monday -- Returns constant: Monday (day of week)
set textStyleConstant to bold -- Returns constant: bold (text style)

-- Converting constants to strings
set mondayString to mondayConstant as string -- Becomes "Monday"
set textStyleString to textStyleConstant as string -- Becomes "bold"

-- Constants typically have a class name that categorizes them
set mondayClass to class of mondayConstant -- Returns 'weekday'
set textStyleClass to class of textStyleConstant -- Returns 'style'

return "Finder sorting constants: " & nameSort & ", " & sizeSort & ", " & dateSort & return & ¬
  "Finder view mode constants: " & listViewMode & ", " & iconViewMode & ", " & columnViewMode & return & ¬
  "AppleScript constants: " & mondayConstant & " (class: " & mondayClass & "), " & ¬
  textStyleConstant & " (class: " & textStyleClass & ")" & return & ¬
  "As strings: " & mondayString & ", " & textStyleString
