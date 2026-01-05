---
id: keynote_presenter_notes
title: Keynote: Get and Set Presenter Notes
description: Gets or sets the presenter notes for the current slide in Keynote.
---
{notesText}

on managePresenterNotes(newNotes)
  tell application "Keynote"
    if not running then return "error: Keynote is not running."
    if (count of documents) is 0 then return "error: No Keynote presentation is open."
    activate
    
    try
      tell front document
        set currentSlide to current slide
        if currentSlide is missing value then
          return "error: No slide is currently selected."
        end if
        
        if newNotes is not missing value and newNotes is not "" and newNotes is not "{notesText}" then
          -- Set presenter notes
          set presenter notes of currentSlide to newNotes
          return "Presenter notes set for current slide: " & newNotes
        else
          -- Get presenter notes
          set currentNotes to presenter notes of currentSlide
          if currentNotes is missing value then set currentNotes to "(empty)"
          return "Current presenter notes: " & currentNotes
        end if
      end tell
    on error errMsg
      return "error: Failed to manage presenter notes in Keynote - " & errMsg
    end try
  end tell
end managePresenterNotes

return my managePresenterNotes("{notesText}")
