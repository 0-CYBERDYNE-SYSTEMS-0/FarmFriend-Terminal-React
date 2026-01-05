---
id: things_url_scheme
title: Use Things URL Scheme
description: Use AppleScript with Things URL scheme for quick actions
---
-- Quick add a to-do
open location "things:///add?title=Buy%20milk&notes=From%20the%20grocery%20store&when=today"

-- Open a specific list
open location "things:///show?id=today"

-- Search for to-dos
open location "things:///search?query=important"
