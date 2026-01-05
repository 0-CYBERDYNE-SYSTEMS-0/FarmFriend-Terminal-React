---
id: xcode_run_unit_tests
title: Xcode: Run Unit Tests
description: Runs unit tests for an open Xcode project using XCTest.
---
{waitTime}

on runXcodeUnitTests(waitTime)
  -- Default wait time of 60 seconds if not specified
  if waitTime is missing value or waitTime is "" then
    set waitTime to 60
  else
    try
      set waitTime to waitTime as number
    on error
      set waitTime to 60
    end try
  end if
  
  tell application "Xcode"
    activate
    delay 1
  end tell
  
  set testResult to "Test result unknown"
  
  try
    tell application "System Events"
      tell process "Xcode"
        -- Use keyboard shortcut Command+U to run tests
        keystroke "u" using {command down}
        
        -- Wait for tests to complete
        set startTime to current date
        set timeoutDate to startTime + waitTime
        
        repeat
          delay 1
          
          -- Check for test status notifications
          set testsSucceeded to false
          set testsFailed to false
          
          -- Look for the test navigator view to check results
          try
            -- Check for green checkmarks indicating success
            set testsSucceeded to exists (first UI element of UI element 1 of window 1 whose description contains "Test Succeeded")
          end try
          
          try
            -- Check for red X marks indicating failure
            set testsFailed to exists (first UI element of UI element 1 of window 1 whose description contains "Test Failed")
          end try
          
          if testsSucceeded then
            set testResult to "All tests succeeded"
            exit repeat
          else if testsFailed then
            set testResult to "One or more tests failed"
            exit repeat
          end if
          
          -- Check if we've timed out
          if (current date) > timeoutDate then
            set testResult to "Test timeout after " & waitTime & " seconds"
            exit repeat
          end if
        end repeat
      end tell
    end tell
    
    return testResult
  on error errMsg number errNum
    return "error (" & errNum & ") running Xcode unit tests: " & errMsg
  end try
end runXcodeUnitTests

return my runXcodeUnitTests("{waitTime}")
