---
id: contacts_create_group
title: Contacts: Create Contact Group
description: Creates a new contact group in the Contacts app.
---
on run {groupName, contactsList}
  tell application "Contacts"
    try
      -- Handle placeholder substitution
      if groupName is "" or groupName is missing value then
        set groupName to "{groupName}"
      end if
      
      if contactsList is "" or contactsList is missing value then
        set contactsList to "{contactsList}"
      end if
      
      -- Check if a group with this name already exists
      set existingGroups to (every group whose name is groupName)
      
      if (count of existingGroups) > 0 then
        return "A group named \"" & groupName & "\" already exists."
      end if
      
      -- Create the new group
      set newGroup to make new group with properties {name:groupName}
      
      -- If contacts were provided, add them to the group
      set contactsAdded to 0
      
      if contactsList is not "" and contactsList is not "{contactsList}" then
        -- Split the comma-separated list
        set AppleScript's text item delimiters to ","
        set contactNames to text items of contactsList
        set AppleScript's text item delimiters to ""
        
        -- Find and add each contact
        repeat with contactName in contactNames
          -- Trim whitespace
          set trimmedName to do shell script "echo " & quoted form of contactName & " | sed 's/^[ \t]*//;s/[ \t]*$//'"
          
          if trimmedName is not "" then
            -- Find contacts matching this name
            set matchingPeople to (every person whose name contains trimmedName)
            
            if (count of matchingPeople) > 0 then
              -- Add the first matching contact to the group
              add person (item 1 of matchingPeople) to newGroup
              set contactsAdded to contactsAdded + 1
            end if
          end if
        end repeat
      end if
      
      -- Save changes
      save
      
      -- Return success message
      if contactsAdded > 0 then
        return "Successfully created group \"" & groupName & "\" with " & contactsAdded & " contact(s) added."
      else
        return "Successfully created empty group \"" & groupName & "\"."
      end if
      
    on error errMsg number errNum
      return "Error (" & errNum & "): Failed to create contact group - " & errMsg
    end try
  end tell
end run
