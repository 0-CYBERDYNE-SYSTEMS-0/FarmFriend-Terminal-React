---
id: kaleidoscope_dev_tools_integration
title: Integrate Kaleidoscope with Developer Tools
description: Advanced script to integrate Kaleidoscope with various developer tools
---
-- Compare Xcode project files
compareXcodeProjectFiles("/Users/username/Projects/MyApp.xcodeproj", "/Users/username/Projects/Backup/MyApp.xcodeproj")

-- Setup Kaleidoscope as Git diff tool
setupAsGitDiffTool()

-- Compare latest changes in Git repository
compareLatestGitChanges("/Users/username/Projects/MyRepo")

-- Compare specific branches
compareGitBranches("/Users/username/Projects/MyRepo", "main", "feature/new-ui")
