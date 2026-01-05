---
id: mail_template_system
title: Mail Template System
description: Email template management for Apple Mail automation
---
-- Create a new template
on createEmailTemplate(templateName, templateContent)
  try
    -- Save the template to the templates folder
    set templatePath to templateFolder & templateName & ".mailtemplate"
    set templatePath to do shell script "echo " & quoted form of templatePath
    
    do shell script "echo " & quoted form of templateContent & " > " & quoted form of templatePath
    
    logMessage("Template created: " & templateName)
    return "Template '" & templateName & "' created successfully"
  on error errMsg
    logMessage("Error creating template: " & errMsg)
    return "Error creating template: " & errMsg
  end try
end createEmailTemplate
