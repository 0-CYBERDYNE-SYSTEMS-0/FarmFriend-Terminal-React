---
id: firefox_save_page_as_pdf
title: Firefox: Save Page as PDF
description: Saves the current Firefox page as a PDF file using UI automation.
---
on run {input, parameters}
  -- Set default filename and location
  set defaultLocation to (path to desktop folder as string)
  set pdfFilename to "{filename}"
  
  -- If no filename is provided, use a timestamp
  if pdfFilename is "" then
    set currentDate to current date
    set pdfFilename to "Firefox_Page_" & (year of currentDate as string) & "-" & (month of currentDate as integer as string) & "-" & (day of currentDate as string) & "_" & (time string of currentDate)
  end if
  
  -- Ensure .pdf extension
  if pdfFilename does not end with ".pdf" then
    set pdfFilename to pdfFilename & ".pdf"
  end if
  
  tell application "Firefox"
    activate
    delay 0.5 -- Allow Firefox to activate
  end tell
  
  -- Start print process
  tell application "System Events"
    tell process "Firefox"
      -- Open Print dialog with Command+P
      keystroke "p" using command down
      delay 1.5 -- Wait for print dialog to appear
      
      -- Select PDF dropdown
      keystroke tab
      delay 0.3
      repeat 3 times
        key code 125 -- Down arrow to reach the PDF dropdown
        delay 0.2
      end repeat
      
      -- Open PDF dropdown menu
      keystroke space
      delay 0.5
      
      -- Select "Save as PDF" option (may need adjustment based on your system)
      key code 125 -- Down arrow
      key code 125 -- Down arrow
      key code 125 -- Down arrow
      delay 0.2
      keystroke return
      delay 1 -- Wait for Save dialog
      
      -- Enter filename in Save dialog
      keystroke "a" using command down -- Select all text
      keystroke pdfFilename -- Type new filename
      delay 0.5
      
      -- Navigate to save location if needed (Desktop is usually default)
      -- For custom location, additional UI scripting would be needed here
      
      -- Click Save button
      keystroke return
      delay 1.5 -- Allow save to complete
    end tell
  end tell
  
  return "Saved current Firefox page as PDF: " & pdfFilename & " on Desktop"
end run
