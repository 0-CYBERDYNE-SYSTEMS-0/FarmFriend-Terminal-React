---
id: keychain_get_password
title: Keychain Access: Retrieve Password
description: >-
  Retrieves a stored password from the macOS Keychain using the security
  command-line tool.
---
{accountName}
{serviceName}
{serverName}

on getPasswordFromKeychain(accountName, serviceName, serverName)
  -- Validate inputs
  if accountName is missing value or accountName is "" then
    return "error: Account name is required."
  end if
  
  try
    set cmdArgs to ""
    set cmdType to ""
    
    -- Determine which type of password to retrieve
    if serviceName is not missing value and serviceName is not "" then
      -- Find generic password (application/service password)
      set cmdType to "find-generic-password"
      set cmdArgs to "-a " & quoted form of accountName & " -s " & quoted form of serviceName
    else if serverName is not missing value and serverName is not "" then
      -- Find internet password (website/server password)
      set cmdType to "find-internet-password"
      set cmdArgs to "-a " & quoted form of accountName & " -s " & quoted form of serverName
    else
      -- Default to generic password search with just the account
      set cmdType to "find-generic-password"
      set cmdArgs to "-a " & quoted form of accountName
    end if
    
    -- Build the security command with password output
    set securityCmd to "security " & cmdType & " " & cmdArgs & " -w"
    
    -- Execute the command and capture the password
    -- NOTE: This may trigger a keychain prompt for user approval
    set thePassword to do shell script securityCmd
    
    -- Return a success message (intentionally NOT returning the actual password)
    if cmdType is "find-generic-password" then
      if serviceName is not missing value and serviceName is not "" then
        return "Successfully retrieved password for account '" & accountName & "' and service '" & serviceName & "'."
      else
        return "Successfully retrieved password for account '" & accountName & "'."
      end if
    else
      return "Successfully retrieved password for account '" & accountName & "' on server '" & serverName & "'."
    end if
  on error errMsg
    if errMsg contains "could not be found" then
      return "No password found matching your criteria."
    else
      return "Error retrieving password: " & errMsg
    end if
  end try
end getPasswordFromKeychain

-- Using the script with values from MCP_INPUT placeholders
return my getPasswordFromKeychain("{accountName}", "{serviceName}", "{serverName}")
