---
id: safari_switch_tab
title: Safari: Switch Tab
description: >-
  Switches to a tab with a specific index or one that matches a URL/title
  pattern in Safari.
---
{tabIndex}
{searchPattern}

on switchSafariTab(tabIndex, searchPattern)
  if not application "Safari" is running then
    return "error: Safari is not running."
  end if
  
  tell application "Safari"
    try
      if (count of windows) is 0 then
        return "error: No windows open in Safari."
      end if
      
      tell front window
        if (count of tabs) is 0 then
          return "error: No tabs open in Safari."
        end if
        
        -- Case 1: Switch by index if provided and valid
        if tabIndex is not missing value and tabIndex is not "" then
          try
            set tabIndexNum to tabIndex as number
            if tabIndexNum < 1 or tabIndexNum > (count of tabs) then
              return "error: Invalid tab index. Must be between 1 and " & (count of tabs) & "."
            end if
            
            set current tab to tab tabIndexNum
            return "Successfully switched to tab " & tabIndexNum & ": " & (name of current tab)
          on error
            return "error: Invalid tab index. Please provide a number."
          end try
        -- Case 2: Switch by search pattern
        else if searchPattern is not missing value and searchPattern is not "" then
          set foundMatch to false
          set matchedTabIndex to 0
          
          repeat with i from 1 to count of tabs
            set currentTab to tab i
            set tabURL to URL of currentTab
            set tabTitle to name of currentTab
            
            -- Case-insensitive search in both URL and title
            if ((tabURL contains searchPattern) or (my caseInsensitiveContains(tabTitle, searchPattern))) then
              set current tab to currentTab
              set foundMatch to true
              set matchedTabIndex to i
              exit repeat
            end if
          end repeat
          
          if foundMatch then
            return "Successfully switched to tab " & matchedTabIndex & " matching pattern '" & searchPattern & "': " & (name of current tab)
          else
            return "error: No tab found matching pattern '" & searchPattern & "'."
          end if
        else
          return "error: No tab index or search pattern provided."
        end if
      end tell
    on error errMsg
      return "error: Failed to switch tab - " & errMsg
    end try
  end tell
end switchSafariTab

-- Helper function for case-insensitive string comparison
on caseInsensitiveContains(sourceText, searchText)
  set lowercaseSource to my toLowerCase(sourceText)
  set lowercaseSearch to my toLowerCase(searchText)
  return lowercaseSource contains lowercaseSearch
end caseInsensitiveContains

-- Helper function to convert text to lowercase
on toLowerCase(sourceText)
  set lowercaseText to ""
  set upperChars to "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  set lowerChars to "abcdefghijklmnopqrstuvwxyz"
  
  repeat with i from 1 to length of sourceText
    set currentChar to character i of sourceText
    set charPos to offset of currentChar in upperChars
    
    if charPos > 0 then
      set lowercaseText to lowercaseText & character charPos of lowerChars
    else
      set lowercaseText to lowercaseText & currentChar
    end if
  end repeat
  
  return lowercaseText
end toLowerCase

return my switchSafariTab("{tabIndex}", "{searchPattern}")
