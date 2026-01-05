---
id: mail_ui_components
title: Mail UI Components
description: User interface components for the Mail Automation system
---
-- Show the main Mail Automation menu
on showMailMenu()
  if not initializeMailAutomation() then
    return "Failed to initialize Mail Automation"
  end if
  
  set menuOptions to {"New Email", "Search/Organize Emails", "Manage Templates", "Save Draft as Template", "Cancel"}
  
  set selectedOption to choose from list menuOptions with prompt "Mail Automation:" default items {"New Email"}
  
  if selectedOption is false then
    return "Mail automation cancelled"
  end if
  
  set menuChoice to item 1 of selectedOption
  
  if menuChoice is "New Email" then
    return showNewEmailDialog()
    
  else if menuChoice is "Search/Organize Emails" then
    return showSearchOrganizeDialog()
    
  else if menuChoice is "Manage Templates" then
    return showTemplateDialog()
    
  else if menuChoice is "Save Draft as Template" then
    return showSaveDraftDialog()
    
  else
    return "Mail automation cancelled"
  end if
end showMailMenu
