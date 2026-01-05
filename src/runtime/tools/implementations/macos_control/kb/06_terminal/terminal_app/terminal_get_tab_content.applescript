---
id: terminal_get_tab_content
title: Terminal: Get Current Tab Content
description: >-
  Retrieves the full text content (scrollback history) of the currently active
  tab in the frontmost Terminal.app window.
---
on runWithInput(inputData, legacyArguments)
    tell application "Terminal"
        activate
        if not (exists window 1) then
            return "Error: Terminal.app has no windows open."
        end if
        
        try
            set frontWindow to window 1
            set currentTab to selected tab of frontWindow
            set tabContent to history of currentTab
            return tabContent
        on error errMsg
            return "Error retrieving tab content: " & errMsg
        end try
    end tell
end runWithInput
