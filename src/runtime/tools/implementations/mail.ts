import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

type MailArgs = {
  action?: string;
  query?: string;
  sender?: string;
  subject?: string;
  recipient?: string;
  body?: string;
  message_id?: string;
  mailbox?: string;
  limit?: number;
  include_body?: boolean;
  pii_redact?: boolean;
  date_from?: string;
  date_to?: string;
  draft_id?: string;
  attachment_paths?: string[];
};

type MailMessage = {
  id: string;
  subject: string;
  sender: string;
  recipients: string[];
  date: string;
  read_status: boolean;
  body?: string;
  snippet?: string;
  mailbox?: string;
};

function isMac(): boolean {
  return process.platform === "darwin";
}

/**
 * Execute AppleScript and return the result
 */
async function runAppleScript(
  script: string,
  signal: AbortSignal
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn("osascript", ["-e", script], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out: Buffer[] = [];
    const err: Buffer[] = [];

    const onAbort = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    };
    if (signal.aborted) onAbort();
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout?.on("data", (b) => out.push(b));
    child.stderr?.on("data", (b) => err.push(b));
    child.on("error", (e) => reject(e));
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      resolve({
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
        code,
      });
    });
  });
}

/**
 * Call maclocal-api for local PII processing
 * This requires maclocal-api server to be running locally
 */
async function callMacLocalAPI(
  prompt: string,
  signal: AbortSignal
): Promise<string> {
  const API_URL = process.env.MACLOCAL_API_URL || "http://localhost:8080/v1/chat/completions";
  const API_KEY = process.env.MACLOCAL_API_KEY || "local-key";

  try {
    const controller = new AbortController();
    signal.addEventListener("abort", () => controller.abort());

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "apple-foundation-model",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`maclocal-api request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    if (error.name === "AbortError" || signal.aborted) {
      throw new Error("maclocal-api request aborted");
    }
    // If maclocal-api is not available, return a warning instead of failing
    console.warn("maclocal-api not available:", error.message);
    return `[Warning: maclocal-api not available for PII processing. Install and run maclocal-api from https://github.com/scouzi1966/maclocal-api]`;
  }
}

/**
 * Redact PII from text using local LLM
 */
async function redactPII(text: string, signal: AbortSignal): Promise<string> {
  const prompt = `Analyze the following text and redact any personally identifiable information (PII) including:
- Email addresses
- Phone numbers
- Street addresses
- Social Security numbers
- Credit card numbers
- Names (when used in sensitive contexts)
- Account numbers
- Other sensitive personal data

Replace each PII instance with [REDACTED: type]. Return only the redacted text.

Text to analyze:
${text}`;

  return await callMacLocalAPI(prompt, signal);
}

/**
 * Search emails using Mail.app AppleScript
 */
async function searchEmails(
  args: MailArgs,
  signal: AbortSignal
): Promise<MailMessage[]> {
  const conditions: string[] = [];
  
  if (args.sender) {
    conditions.push(`whose sender contains "${args.sender.replace(/"/g, '\\"')}"`);
  }
  if (args.subject) {
    conditions.push(`whose subject contains "${args.subject.replace(/"/g, '\\"')}"`);
  }
  if (args.mailbox) {
    conditions.push(`of mailbox "${args.mailbox.replace(/"/g, '\\"')}"`);
  }

  const conditionStr = conditions.join(" and ");
  const limit = args.limit || 10;

  const script = `
tell application "Mail"
    set messageList to {}
    set msgs to messages ${conditionStr}
    repeat with msg in msgs
        if (count of messageList) >= ${limit} then exit repeat
        set msgInfo to {¬
            id:id of msg, ¬
            subject:subject of msg, ¬
            sender:sender of msg, ¬
            date_received:date received of msg as string, ¬
            read_status:read status of msg, ¬
            message_content:${args.include_body ? "content of msg" : '""'}}
        copy msgInfo to end of messageList
    end repeat
    return messageList
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Mail search failed: ${result.stderr || result.stdout}`);
  }

  // Parse AppleScript result (simplified - real implementation would need robust parsing)
  const messages: MailMessage[] = [];
  // AppleScript returns structured data that needs parsing
  // For now, return the raw output wrapped
  return [
    {
      id: "search-result",
      subject: "Search Results",
      sender: "",
      recipients: [],
      date: new Date().toISOString(),
      read_status: true,
      body: result.stdout,
      mailbox: args.mailbox,
    },
  ];
}

/**
 * Read a specific email
 */
async function readEmail(
  messageId: string,
  piiRedact: boolean,
  signal: AbortSignal
): Promise<MailMessage> {
  const script = `
tell application "Mail"
    set msg to message id "${messageId.replace(/"/g, '\\"')}"
    return {¬
        id:id of msg, ¬
        subject:subject of msg, ¬
        sender:sender of msg, ¬
        recipients:address of recipients of msg, ¬
        date_received:date received of msg as string, ¬
        read_status:read status of msg, ¬
        content:content of msg}
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Failed to read email: ${result.stderr || result.stdout}`);
  }

  let body = result.stdout;
  
  // Apply PII redaction if requested
  if (piiRedact && body) {
    body = await redactPII(body, signal);
  }

  return {
    id: messageId,
    subject: "Email Content",
    sender: "",
    recipients: [],
    date: new Date().toISOString(),
    read_status: true,
    body,
  };
}

/**
 * Compose and send email
 */
async function composeEmail(args: MailArgs, signal: AbortSignal): Promise<string> {
  if (!args.recipient || !args.subject) {
    throw new Error("compose_email: requires recipient and subject");
  }

  const body = args.body || "";
  const attachments = args.attachment_paths || [];

  let attachmentScript = "";
  if (attachments.length > 0) {
    const attachmentPaths = attachments
      .map((p) => `POSIX file "${path.resolve(p).replace(/"/g, '\\"')}"`)
      .join(", ");
    attachmentScript = `
        repeat with attachFile in {${attachmentPaths}}
            make new attachment with properties {file name:attachFile} at after the last paragraph of content of outgoingMessage
        end repeat`;
  }

  const script = `
tell application "Mail"
    set outgoingMessage to make new outgoing message with properties {¬
        subject:"${args.subject.replace(/"/g, '\\"')}", ¬
        content:"${body.replace(/"/g, '\\"')}"}
    tell outgoingMessage
        make new to recipient with properties {address:"${args.recipient.replace(/"/g, '\\"')}"}
        ${attachmentScript}
    end tell
    send outgoingMessage
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Failed to send email: ${result.stderr || result.stdout}`);
  }

  return `Email sent successfully to ${args.recipient}`;
}

/**
 * Create draft email
 */
async function createDraft(args: MailArgs, signal: AbortSignal): Promise<string> {
  if (!args.recipient || !args.subject) {
    throw new Error("create_draft: requires recipient and subject");
  }

  const body = args.body || "";

  const script = `
tell application "Mail"
    set draftMessage to make new outgoing message with properties {¬
        subject:"${args.subject.replace(/"/g, '\\"')}", ¬
        content:"${body.replace(/"/g, '\\"')}", ¬
        visible:true}
    tell draftMessage
        make new to recipient with properties {address:"${args.recipient.replace(/"/g, '\\"')}"}
    end tell
    return id of draftMessage
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Failed to create draft: ${result.stderr || result.stdout}`);
  }

  return `Draft created with ID: ${result.stdout.trim()}`;
}

/**
 * Edit existing draft
 */
async function editDraft(args: MailArgs, signal: AbortSignal): Promise<string> {
  if (!args.draft_id) {
    throw new Error("edit_draft: requires draft_id");
  }

  const updates: string[] = [];
  if (args.subject) {
    updates.push(`set subject of msg to "${args.subject.replace(/"/g, '\\"')}"`);
  }
  if (args.body) {
    updates.push(`set content of msg to "${args.body.replace(/"/g, '\\"')}"`);
  }

  const script = `
tell application "Mail"
    set msg to message id "${args.draft_id.replace(/"/g, '\\"')}"
    ${updates.join("\n    ")}
    return "Draft updated"
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Failed to edit draft: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

/**
 * Archive or move email to mailbox
 */
async function archiveEmail(
  messageId: string,
  targetMailbox: string,
  signal: AbortSignal
): Promise<string> {
  const script = `
tell application "Mail"
    set msg to message id "${messageId.replace(/"/g, '\\"')}"
    set targetBox to mailbox "${targetMailbox.replace(/"/g, '\\"')}"
    move msg to targetBox
    return "Message moved to ${targetMailbox}"
end tell`;

  const result = await runAppleScript(script, signal);
  if (result.code !== 0) {
    throw new Error(`Failed to archive email: ${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

/**
 * Analyze email content for insights using local LLM
 */
async function analyzeEmail(
  emailContent: string,
  analysisType: string,
  signal: AbortSignal
): Promise<string> {
  const prompts: Record<string, string> = {
    summary: "Provide a concise summary of this email:",
    sentiment: "Analyze the sentiment and tone of this email:",
    action_items: "Extract any action items or tasks mentioned in this email:",
    priority: "Assess the priority level of this email (high/medium/low) and explain why:",
    category: "Categorize this email (e.g., work, personal, newsletter, notification):",
  };

  const prompt = prompts[analysisType] || prompts.summary;
  const fullPrompt = `${prompt}\n\n${emailContent}`;

  return await callMacLocalAPI(fullPrompt, signal);
}

/**
 * Main mail tool handler
 */
export async function mailTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  if (!isMac()) {
    throw new Error("mail: only supported on macOS");
  }

  const args = argsRaw as MailArgs;
  const action = String(args?.action || "").trim().toLowerCase();

  if (!action) {
    throw new Error("mail: missing args.action");
  }

  let result: any = { ok: true, action };

  try {
    switch (action) {
      case "search":
        result.messages = await searchEmails(args, signal);
        result.count = result.messages.length;
        break;

      case "read":
        if (!args.message_id) {
          throw new Error("mail(read): requires message_id");
        }
        result.message = await readEmail(
          args.message_id,
          args.pii_redact || false,
          signal
        );
        break;

      case "compose":
      case "send":
        result.status = await composeEmail(args, signal);
        break;

      case "create_draft":
        result.status = await createDraft(args, signal);
        break;

      case "edit_draft":
        result.status = await editDraft(args, signal);
        break;

      case "archive":
      case "move":
        if (!args.message_id) {
          throw new Error("mail(archive): requires message_id");
        }
        const mailbox = args.mailbox || "Archive";
        result.status = await archiveEmail(args.message_id, mailbox, signal);
        break;

      case "analyze":
        if (!args.message_id && !args.body) {
          throw new Error("mail(analyze): requires message_id or body");
        }
        let content = args.body || "";
        if (args.message_id && !content) {
          const msg = await readEmail(args.message_id, false, signal);
          content = msg.body || "";
        }
        const analysisType = args.query || "summary";
        result.analysis = await analyzeEmail(content, analysisType, signal);
        break;

      case "redact_pii":
        if (!args.body && !args.message_id) {
          throw new Error("mail(redact_pii): requires body or message_id");
        }
        let textToRedact = args.body || "";
        if (args.message_id && !textToRedact) {
          const msg = await readEmail(args.message_id, false, signal);
          textToRedact = msg.body || "";
        }
        result.redacted_text = await redactPII(textToRedact, signal);
        break;

      default:
        throw new Error(`mail: unknown action '${action}'. Supported actions: search, read, compose, send, create_draft, edit_draft, archive, move, analyze, redact_pii`);
    }

    return JSON.stringify(result, null, 2);
  } catch (error: any) {
    result.ok = false;
    result.error = error.message;
    throw new Error(JSON.stringify(result, null, 2));
  }
}
