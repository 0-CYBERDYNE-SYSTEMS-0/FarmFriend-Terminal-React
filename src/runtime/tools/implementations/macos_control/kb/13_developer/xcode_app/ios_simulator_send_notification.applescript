---
id: ios_simulator_send_notification
title: iOS Simulator: Send Push Notification
description: Sends a test push notification to an app running in the iOS Simulator.
---
{bundleID}
{title}
{body}
{badge}
{deviceIdentifier}
{customData}

on sendPushNotificationToSimulator(bundleID, title, body, badge, deviceIdentifier, customData)
  if bundleID is missing value or bundleID is "" then
    return "error: Bundle ID not provided. Specify the app's bundle identifier."
  end if
  
  if title is missing value or title is "" then
    set title to "Test Notification"
  end if
  
  if body is missing value or body is "" then
    set body to "This is a test push notification"
  end if
  
  -- Default to booted device if not specified
  if deviceIdentifier is missing value or deviceIdentifier is "" then
    set deviceIdentifier to "booted"
  end if
  
  -- Create temporary file for notification payload
  set tempFile to do shell script "mktemp /tmp/notification_XXXXX.apns"
  
  try
    -- Build notification JSON payload
    set alertPayload to "{\"title\":\"" & title & "\",\"body\":\"" & body & "\"}"
    set apsPayload to "{\"alert\":" & alertPayload
    
    -- Add badge if provided
    if badge is not missing value and badge is not "" then
      try
        set badgeNum to badge as number
        set apsPayload to apsPayload & ",\"badge\":" & badgeNum
      end try
    end if
    
    -- Close aps object
    set apsPayload to apsPayload & ",\"sound\":\"default\"}"
    
    -- Build the full payload
    set fullPayload to "{\"aps\":" & apsPayload
    
    -- Add Simulator Target Bundle
    set fullPayload to fullPayload & ",\"Simulator Target Bundle\":\"" & bundleID & "\""
    
    -- Add custom data if provided
    if customData is not missing value and customData is not "" then
      -- Check if it starts with { to treat as partial JSON
      if customData starts with "{" then
        -- Remove outer braces to merge with our JSON
        set customData to text 2 thru -2 of customData
        set fullPayload to fullPayload & "," & customData
      else
        -- Treat as simple string data
        set fullPayload to fullPayload & ",\"customData\":\"" & customData & "\""
      end if
    end if
    
    -- Close the full payload
    set fullPayload to fullPayload & "}"
    
    -- Write payload to temp file
    do shell script "echo " & quoted form of fullPayload & " > " & quoted form of tempFile
    
    -- Send the notification to the simulator
    set pushCmd to "xcrun simctl push " & quoted form of deviceIdentifier & " " & quoted form of bundleID & " " & quoted form of tempFile
    
    try
      do shell script pushCmd
      set notificationSent to true
    on error errMsg
      return "Error sending push notification: " & errMsg
    end try
    
    -- Clean up temp file
    do shell script "rm " & quoted form of tempFile
    
    if notificationSent then
      return "Push notification sent successfully to " & bundleID & " on " & deviceIdentifier & " simulator.

Notification details:
Title: " & title & "
Body: " & body & "
" & (if badge is not missing value and badge is not "" then "Badge: " & badge & "
" else "") & (if customData is not missing value and customData is not "" then "Custom Data: Included" else "")
    else
      return "Failed to send push notification to " & bundleID
    end if
  on error errMsg number errNum
    -- Clean up temp file if it exists
    try
      do shell script "rm " & quoted form of tempFile
    end try
    
    return "error (" & errNum & ") sending push notification: " & errMsg
  end try
end sendPushNotificationToSimulator

return my sendPushNotificationToSimulator("{bundleID}", "{title}", "{body}", "{badge}", "{deviceIdentifier}", "{customData}")
