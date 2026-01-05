---
id: kaleidoscope_file_version_tracker
title: Track File Versions with Kaleidoscope
description: Advanced script to track file versions and compare changes using Kaleidoscope
---
-- Initialize tracking for a file
initializeVersionTracking("/Users/username/Documents/important.txt")

-- Save a new version and compare with previous
saveNewVersion("/Users/username/Documents/important.txt", "Added new section")

-- Compare specific versions
compareVersions("/Users/username/Documents/important.txt", 2, 3)

-- List all versions of a file
listVersions("/Users/username/Documents/important.txt")
