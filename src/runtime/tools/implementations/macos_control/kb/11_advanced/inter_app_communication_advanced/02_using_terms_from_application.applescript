---
id: advanced_using_terms_from
title: Advanced: ''using terms from application'' Block
description: >-
  Explains how to use the 'using terms from application' block to resolve
  terminology conflicts between applications or scripting additions.
---
-- Scenario: Finder and System Events both have a concept of 'window'.
-- We want to use Finder's definition of 'window' while inside a System Events 'tell' block.

tell application "System Events"
  -- Commands here use System Events' dictionary by default.
  set processList to name of every process
  
  set finderWindowCount to "(Finder not running or no windows)"
  if "Finder" is in processList then
    using terms from application "Finder"
      -- Inside this block, 'window' refers to Finder's window object.
      try
        tell application "Finder"
          set finderWindowCount to count of windows
        end tell
      on error errMsg
        set finderWindowCount to "Error getting Finder window count: " & errMsg
      end try
    end using terms from
    
    -- Outside the block, 'window' would again refer to System Events' concept (if it had one, or error if ambiguous).
    -- For example, this would likely error if System Events doesn't have a top-level 'window' property or command:
    -- set sysEventWindowCount to count of windows 
  end if
  
  set sysEventActive to name of first application process whose frontmost is true
  
end tell

-- Another common scenario: Scripting Additions
-- Imagine an OSAX (Scripting Addition) named "MyTextTools.osax" that defines a command `reverse text`.
-- If you are inside `tell application "TextEdit"`, AppleScript might look for `reverse text` in TextEdit's dictionary first.

set originalText to "stressed"
set reversedText to "(MyTextTools.osax not available or error)"

(*
-- This is a hypothetical example as "MyTextTools.osax" doesn't exist by default.
-- Assume "MyTextTools.osax" is installed and provides 'reverse text'.

tell application "TextEdit" -- Or any other app
  -- If TextEdit also had a 'reverse text' command, it would be used.
  -- To ensure the OSAX command is used:
  using terms from scripting additions
    -- Now, 'reverse text' will prioritize OSAX commands.
    -- If multiple OSAX defined it, it would be ambiguous, but usually not an issue.
    try
      set reversedText to reverse text originalText
    on error e
      set reversedText to "Error using OSAX: " & e
    end try
  end using terms from
end tell
*)
-- For demonstration, let's simulate the effect if the OSAX worked:
if originalText is "stressed" then
  set reversedText to "desserts" -- Manually setting for example
else
  set reversedText to "(MyTextTools.osax not used)"
end if


return "System Events active app: " & sysEventActive & ¬
  "\nFinder window count (using its terms): " & finderWindowCount & ¬
  "\nOriginal Text: " & originalText & " -> Reversed (simulated OSAX): " & reversedText
