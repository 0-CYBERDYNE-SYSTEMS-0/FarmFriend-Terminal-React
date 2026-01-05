---
id: workflow/screenshot_selection
title: Take Screenshot of Selection
description: Allows user to select an area to screenshot
---
do shell script "screencapture -i ~/Desktop/screenshot-$(date +%Y%m%d-%H%M%S).png"
return "Screenshot saved to Desktop"
