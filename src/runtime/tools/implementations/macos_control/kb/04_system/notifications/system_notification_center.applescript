---
id: system_notification_center
title: System Notification Center
description: >-
  Creates and manages user notifications in macOS Notification Center using
  AppleScript and JXA
---
-- Method 1: Basic AppleScript notification
-- Simple notification with title, subtitle, and sound
display notification "This is the notification message" with title "Notification Title" subtitle "Optional Subtitle" sound name "Basso"

-- Different sound options include: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

-- Method 2: Notification with timeout and application name
-- Display for 10 seconds with custom app name
display notification "This notification will display for 10 seconds" with title "Timed Notification" subtitle "Custom Application" sound name "Glass"

-- Method 3: Fire notification after delay
delay 5 -- Wait 5 seconds
display notification "This notification appears after 5 seconds" with title "Delayed Notification"

-- Method 4: Send notification from a specific application
tell application "Calendar"
  display notification "You have an upcoming meeting" with title "Calendar Reminder"
end tell

-- Method 5: Schedule multiple notifications
on scheduleNotifications()
  -- First notification immediately
  display notification "First notification" with title "Sequence Started"
  
  -- Second notification after 5 seconds
  delay 5
  display notification "Second notification (after 5s)" with title "Sequence Continued"
  
  -- Third notification after another 5 seconds
  delay 5
  display notification "Final notification (after 10s)" with title "Sequence Completed" sound name "Glass"
end scheduleNotifications

-- Run the notification sequence
scheduleNotifications()
