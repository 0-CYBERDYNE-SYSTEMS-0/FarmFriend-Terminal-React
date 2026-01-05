---
id: kaleidoscope_cli_integration
title: Kaleidoscope Command Line Integration
description: Use AppleScript with Kaleidoscope's command-line tool ksdiff
---
-- Compare two files using ksdiff
do shell script "/usr/local/bin/ksdiff /path/to/file1.txt /path/to/file2.txt"

-- Merge two files
do shell script "/usr/local/bin/ksdiff --merge /path/to/base.txt /path/to/mine.txt /path/to/theirs.txt -o /path/to/result.txt"
