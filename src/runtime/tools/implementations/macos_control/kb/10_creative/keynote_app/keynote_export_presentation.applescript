---
id: keynote_export_presentation
title: Keynote: Export Presentation (PDF, PowerPoint)
description: Exports the frontmost Keynote presentation to PDF or PowerPoint format.
---
{exportFormat}
{exportPath}

on exportKeynotePresentation(theFormat, theExportPath)
  if theFormat is missing value or (theFormat is not "PDF" and theFormat is not "PowerPoint") then
    return "error: Invalid export format. Use 'PDF' or 'PowerPoint'."
  end if
  if theExportPath is missing value or theExportPath is "" then
    return "error: Export path is required."
  end if

  tell application "Keynote"
    if not running then return "error: Keynote is not running."
    if (count of documents) is 0 then return "error: No Keynote presentation is open."
    activate
    
    set frontDoc to front document
    set destinationFile to POSIX file theExportPath
    
    try
      if theFormat is "PDF" then
        -- PDF export settings can be specified in `as` record if needed.
        -- e.g., {export style:slides, image quality:good, include build stages:false, include presenter notes:false}
        export frontDoc to destinationFile as PDF -- with properties {all stages:false, skipped slides:false}
        return "Presentation exported as PDF to: " & theExportPath
      else if theFormat is "PowerPoint" then
        export frontDoc to destinationFile as Microsoft PowerPoint
        return "Presentation exported as PowerPoint to: " & theExportPath
      end if
    on error errMsg
      return "error: Failed to export Keynote presentation - " & errMsg
    end try
  end tell
end exportKeynotePresentation

return my exportKeynotePresentation("{exportFormat}", "{exportPath}")
