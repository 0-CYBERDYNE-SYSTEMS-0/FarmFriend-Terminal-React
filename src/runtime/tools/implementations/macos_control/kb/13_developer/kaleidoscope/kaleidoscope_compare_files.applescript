---
id: kaleidoscope_compare_files
title: Compare Files with Kaleidoscope
description: Use AppleScript to open and compare files in Kaleidoscope
---
-- Compare two specific files
open location "kaleidoscope://compare?/path/to/file1.txt&/path/to/file2.txt&label=My Comparison"

-- Compare files using the shell command ksdiff
do shell script "/usr/local/bin/ksdiff /path/to/file1.txt /path/to/file2.txt"
