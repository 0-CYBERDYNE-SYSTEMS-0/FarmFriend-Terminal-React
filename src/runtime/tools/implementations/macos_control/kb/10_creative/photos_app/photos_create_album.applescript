---
id: photos_create_album
title: Photos: Create New Album
description: Creates a new album in the Photos app with a specified name.
---
on run {albumName}
  tell application "Photos"
    activate
    try
      if albumName is "" or albumName is missing value then
        set albumName to "{albumName}"
      end if
      
      set newAlbum to make new album named albumName
      
      return "Successfully created new album: " & albumName
      
    on error errMsg number errNum
      if errNum is -1728 then
        return "Error: An album with this name already exists."
      else
        return "Error (" & errNum & "): Failed to create album - " & errMsg
      end if
    end try
  end tell
end run
