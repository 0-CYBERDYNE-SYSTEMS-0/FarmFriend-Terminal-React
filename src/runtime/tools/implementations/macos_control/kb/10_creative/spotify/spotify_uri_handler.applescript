---
id: spotify_uri_handler
title: Spotify: URI Handler
description: >-
  Play Spotify content using Spotify URIs for tracks, albums, artists,
  playlists, and shows.
---
-- Get Spotify URI from input
set spotifyUri to "{spotifyUri}"
if spotifyUri is "" or spotifyUri is "{spotifyUri}" then
  return "Error: No Spotify URI provided. Please provide a Spotify URI or ID."
end if

-- Get content type from input or default to auto-detect
set contentType to "{type}"
if contentType is "" or contentType is "{type}" then
  set contentType to "auto" -- Will auto-detect from URI if possible
end if

-- Process the URI and type
set formattedUri to ""

-- Check if the input is already a full Spotify URI
if spotifyUri starts with "spotify:" then
  set formattedUri to spotifyUri
  
  -- Auto-extract type if needed
  if contentType is "auto" then
    try
      -- Extract type from URI (spotify:type:id format)
      set AppleScript's text item delimiters to ":"
      set uriParts to text items of spotifyUri
      if (count of uriParts) ≥ 3 then
        set extractedType to item 2 of uriParts
        set contentType to extractedType
      end if
      set AppleScript's text item delimiters to ""
    on error
      set contentType to "track" -- Default to track if extraction fails
    end try
  end if
else
  -- Input is just an ID, need to format with the type
  if contentType is "auto" then
    set contentType to "track" -- Default to track type if not specified
  end if
  
  -- Format the URI with the provided ID and determined type
  set formattedUri to "spotify:" & contentType & ":" & spotifyUri
end if

tell application "Spotify"
  if not running then
    return "Spotify is not running. Please launch it first."
  end if
  
  try
    -- Play the content with the appropriate command based on type
    if contentType is "track" or contentType is "episode" then
      play track formattedUri
    else if contentType is "album" or contentType is "show" then
      play track formattedUri
    else if contentType is "artist" then
      play track formattedUri
    else if contentType is "playlist" then
      play track formattedUri
    else
      -- Generic fallback
      play track formattedUri
    end if
    
    -- Wait a moment for playback to start
    delay 1
    
    -- Get information about what's playing
    set playbackInfo to ""
    
    if player state is playing then
      set currentName to name of current track
      set currentArtist to artist of current track
      
      if contentType is "track" or contentType is "episode" then
        set playbackInfo to "Now playing " & contentType & ": " & currentName & " by " & currentArtist
      else if contentType is "album" then
        set albumName to album of current track
        set playbackInfo to "Now playing from album: " & albumName & "\nTrack: " & currentName & " by " & currentArtist
      else if contentType is "artist" then
        set playbackInfo to "Now playing music by artist: " & currentArtist & "\nTrack: " & currentName
      else if contentType is "playlist" or contentType is "show" then
        set playbackInfo to "Now playing from " & contentType & "\nTrack: " & currentName & " by " & currentArtist
      else
        set playbackInfo to "Now playing: " & currentName & " by " & currentArtist
      end if
    else
      set playbackInfo to "Content loaded but not playing. Player state: " & (player state as text)
    end if
    
    return "Successfully played Spotify " & contentType & " with URI: " & formattedUri & "\n\n" & playbackInfo
    
  on error errMsg number errNum
    return "Error playing Spotify content (" & errNum & "): " & errMsg & "\n\nURI attempted: " & formattedUri
  end try
end tell
