---
id: terminal_find_kill_process_by_port
title: Find Process Using Port and Optionally Kill It
description: >-
  Identifies which process is using a specific port and provides the option to
  kill it
---
-- Usage examples:
-- Find process using port 8080
my findProcessByPort(8080, false)

-- Find process using port 3000 and kill it if found
my findProcessByPort(3000, true)
