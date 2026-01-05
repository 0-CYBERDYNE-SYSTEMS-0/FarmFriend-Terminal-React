---
id: workflow/take_screenshot
title: Take Screenshot
description: Takes a screenshot and saves to Desktop
---
do shell script "screencapture -x ~/Desktop/screenshot-$(date +%Y%m%d-%H%M%S).png"
return "Screenshot saved to Desktop"
