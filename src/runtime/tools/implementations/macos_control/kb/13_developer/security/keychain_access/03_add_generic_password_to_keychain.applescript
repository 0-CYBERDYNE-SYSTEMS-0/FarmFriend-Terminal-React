---
id: keychain_add_generic_password
title: Keychain Access: Add Generic Password
description: >-
  Adds a new generic password item to the macOS Keychain using the security
  command-line tool.
---
{serviceName}
{accountName}
{passwordValue}
{commentText}

on addGenericPasswordToKeychain(serviceName, accountName, passwordValue, commentText)
  -- Validate required inputs
  if serviceName is missing value or serviceName is "" then
    return "error: Service name is required."
  end if
  if accountName is missing value or accountName is "" then
    return "error: Account name is required."
  end if
  if passwordValue is missing value or passwordValue is "" then
    return "error: Password value is required."
  end if
  
  try
    -- Build the base command for adding a generic password
    set passwordCmd to "security add-generic-password"
    
    -- Add required parameters
    set passwordCmd to passwordCmd & " -s " & quoted form of serviceName
    set passwordCmd to passwordCmd & " -a " & quoted form of accountName
    
    -- Add optional parameters if provided
    if commentText is not missing value and commentText is not "" then
      set passwordCmd to passwordCmd & " -j " & quoted form of commentText
    end if
    
    -- Add the password securely using stdin
    -- This prevents the password from appearing in process listings or logs
    set passwordCmd to passwordCmd & " -w"
    
    -- Execute the command with the password provided via stdin
    do shell script passwordCmd & " << EOF
" & passwordValue & "
EOF"
    
    -- Return success message
    return "Successfully added password for service '" & serviceName & "' and account '" & accountName & "' to the keychain."
  on error errMsg
    if errMsg contains "The specified item already exists in the keychain" then
      return "Error: A password for this service and account already exists in the keychain. Use 'security delete-generic-password' first to update it."
    else
      return "Error adding password to keychain: " & errMsg
    end if
  end try
end addGenericPasswordToKeychain

-- Using the script with values from MCP_INPUT placeholders
return my addGenericPasswordToKeychain("{serviceName}", "{accountName}", "{passwordValue}", "{commentText}")
