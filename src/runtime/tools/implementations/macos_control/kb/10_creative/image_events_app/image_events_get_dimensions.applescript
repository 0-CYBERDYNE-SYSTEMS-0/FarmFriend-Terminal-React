---
id: image_events_get_dimensions
title: Image Events: Get Image Dimensions
description: >-
  Uses Image Events to open an image and retrieve its width and height in
  pixels.
---
{imagePath}

on getImageDimensions(posixImagePath)
  if posixImagePath is missing value or posixImagePath is "" then return "error: Image path not provided."
  
  try
    set imageFile to POSIX file posixImagePath as alias
    
    tell application "Image Events"
      launch -- Make sure it's running (usually launches silently)
      try
        set img to open imageFile
        set {imgWidth, imgHeight} to dimensions of img
        close img
        return "{width:" & imgWidth & ", height:" & imgHeight & "}" -- Return as a string resembling a record
      on error errMsgImg
        return "error: Image Events could not process file '" & posixImagePath & "': " & errMsgImg
      end try
    end tell
  on error fileErr
    return "error: File not found or invalid path '" & posixImagePath & "': " & fileErr
  end try
end getImageDimensions

return my getImageDimensions("{imagePath}")
