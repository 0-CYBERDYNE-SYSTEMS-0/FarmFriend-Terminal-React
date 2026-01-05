---
id: safari/open_url
title: Open URL in Safari
description: Opens a URL in Safari, creating a new tab in the frontmost window
params: url
---
tell application "Safari"
	activate
	open location "{url}"
end tell
