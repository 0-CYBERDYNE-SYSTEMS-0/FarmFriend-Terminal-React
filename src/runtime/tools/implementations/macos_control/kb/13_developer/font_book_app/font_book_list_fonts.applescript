---
id: font_book_list_fonts
title: Font Book: List Available Fonts
description: Lists available fonts from Font Book application.
---
tell application "Font Book"
  try
    activate
    
    -- Get all enabled fonts
    set allFonts to every font
    
    if (count of allFonts) is 0 then
      return "No fonts found in Font Book."
    end if
    
    -- Create a list of font names
    set fontList to {}
    
    repeat with thisFont in allFonts
      set fontName to name of thisFont
      set fontFamily to family name of thisFont
      set fontInfo to fontName
      
      if fontFamily is not equal to fontName then
        set fontInfo to fontInfo & " (" & fontFamily & ")"
      end if
      
      set end of fontList to fontInfo
    end repeat
    
    -- Sort the font list alphabetically
    set AppleScript's text item delimiters to return
    set sortedFontList to do shell script "echo " & quoted form of (fontList as string) & " | sort"
    set AppleScript's text item delimiters to ""
    
    return "Available Fonts (" & (count of allFonts) & "):\\n" & sortedFontList
    
  on error errMsg number errNum
    return "Error (" & errNum & "): Failed to list fonts - " & errMsg
  end try
end tell
