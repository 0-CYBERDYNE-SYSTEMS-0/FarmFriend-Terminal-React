---
id: keynote_add_slide_master
title: Keynote: Add New Slide with Master
description: >-
  Adds a new slide to the current Keynote presentation using a specified master
  slide name.
---
{masterSlideName}

on addKeynoteSlide(theMasterSlideName)
  if theMasterSlideName is missing value or theMasterSlideName is "" then return "error: Master slide name required."

  tell application "Keynote"
    if not running then return "error: Keynote is not running."
    if (count of documents) is 0 then return "error: No Keynote presentation is open."
    activate
    
    try
      tell front document
        -- Get the master slide object by name
        set targetMaster to first master slide whose name is theMasterSlideName
        if targetMaster is missing value then
          return "error: Master slide '" & theMasterSlideName & "' not found in current theme. Available masters: " & (name of master slides)
        end if
        
        make new slide with properties {base slide:targetMaster}
      end tell
      return "New slide added using master '" & theMasterSlideName & "'."
    on error errMsg
      return "error: Failed to add slide in Keynote - " & errMsg
    end try
  end tell
end addKeynoteSlide

return my addKeynoteSlide("{masterSlideName}")
