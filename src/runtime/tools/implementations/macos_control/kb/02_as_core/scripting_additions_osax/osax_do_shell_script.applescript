---
id: osax_do_shell_script
title: StandardAdditions: do shell script Command
description: Executes a Unix shell command and returns its standard output as a string.
---
-- Simple command
set whoAmI to do shell script "whoami"

-- Command with arguments and variable substitution
set targetFolder to POSIX path of (path to desktop)
set fileList to do shell script "ls -la " & quoted form of targetFolder

-- Command needing admin rights (example, use with caution)
(*
try
  do shell script "mkdir /opt/my_secure_folder" with administrator privileges
  set adminResult to "Created /opt/my_secure_folder with admin rights."
on error adminErr
  set adminResult to "Admin command failed: " & adminErr
end try
*)

return "User: " & whoAmI & "\\nDesktop Listing (first 100 chars):\\n" & (text 1 thru 100 of fileList) & "..."
-- & "\\nAdmin Result: " & adminResult
