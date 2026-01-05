---
id: conventions_how_to_use_kb
title: How to Use This Knowledge Base
description: Explains how to query and use the tips provided by this MCP server.
---
2.  **From Knowledge Base by ID:** If a tip has a "Runnable ID", use `knowledgeBaseScriptId`.
    ```json
    {
      "toolName": "macos_automator:execute_script",
      "arguments": {
        "input": {
          "knowledgeBaseScriptId": "safari_get_front_tab_url",
          // "inputData": { "someKey": "someValue" } // If the KB script expects it
        }
      }
    }
    ```
    Refer to the tip's "Inputs Needed" or "argumentsPrompt" (via `get_scripting_tips`) for required `inputData` or `arguments`.
3.  **From File:** Provide an absolute `scriptPath` to a file on the server.

**Placeholder Conventions for KB Scripts:**
- Use `{yourKeyName}` for values from the `inputData` object.
- Use `{arg1}`, `{arg2}` for values from the `arguments` array.
The server will substitute these before execution. Values are generally escaped as AppleScript strings.
