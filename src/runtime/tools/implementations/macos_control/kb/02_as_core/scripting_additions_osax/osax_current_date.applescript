---
id: osax_current_date
title: StandardAdditions: current date Command
description: Returns the current system date and time as a date object.
---
set now to current date

-- Extracting components
set theYear to year of now
set theMonth to month of now -- e.g., December (a month constant)
set theDay to day of now     -- e.g., 7 (an integer)
set theWeekday to weekday of now -- e.g., Sunday (a weekday constant)

set theHours to hours of now       -- e.g., 14 (integer, 24-hour format)
set theMinutes to minutes of now   -- e.g., 30 (integer)
set theSeconds to seconds of now   -- e.g., 5 (integer)

set timeStr to time string of now  -- e.g., "2:30:05 PM"
set dateStr to date string of now  -- e.g., "Sunday, 7 July 2024"

-- Coercing the full date object to a string
set fullDateString to now as string -- e.g., "Sunday, 7 July 2024 at 14:30:05"

return "Full Date: " & fullDateString & ¬
  "\nYear: " & theYear & ¬
  "\nMonth: " & (theMonth as string) & ¬ -- Coerce month constant for display
  "\nDay: " & theDay & ¬
  "\nWeekday: " & (theWeekday as string) & ¬ -- Coerce weekday constant for display
  "\nTime String: " & timeStr & ¬
  "\nHours: " & theHours & ":" & theMinutes & ":" & theSeconds
