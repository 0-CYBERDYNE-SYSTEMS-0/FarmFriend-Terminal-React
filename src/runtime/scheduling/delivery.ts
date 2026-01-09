import { ScheduledTask } from "./taskStore.js";

export type DeliveryChannelType = "webhook" | "email" | "discord" | "slack";

export type DeliveryChannel = {
  type: DeliveryChannelType;
  config: Record<string, unknown>;
};

export type DeliveryConfig = {
  enabled: boolean;
  channels: DeliveryChannel[];
  bestEffort: boolean;
  includeOutput: boolean;
  includeLogs: boolean;
};

export type DeliveryResult = {
  channel: DeliveryChannelType;
  success: boolean;
  message: string;
  timestamp: string;
};

export type TaskExecutionResult = {
  taskId: string;
  taskName: string;
  ok: boolean;
  error?: string;
  duration_ms: number;
  output?: string;
  logPath?: string;
  session_id?: string;
};

async function sendWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return {
        channel: "webhook",
        success: false,
        message: `HTTP ${response.status}: ${response.statusText}`,
        timestamp
      };
    }

    return {
      channel: "webhook",
      success: true,
      message: "Webhook delivered successfully",
      timestamp
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      channel: "webhook",
      success: false,
      message: `Failed to send webhook: ${message}`,
      timestamp
    };
  }
}

async function sendEmail(
  _to: string,
  _subject: string,
  _body: string
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();
  return {
    channel: "email",
    success: false,
    message: "Email delivery not yet implemented",
    timestamp
  };
}

async function sendDiscord(
  _webhookUrl: string,
  _message: Record<string, unknown>
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();
  return {
    channel: "discord",
    success: false,
    message: "Discord delivery not yet implemented",
    timestamp
  };
}

async function sendSlack(
  _webhookUrl: string,
  _message: Record<string, unknown>
): Promise<DeliveryResult> {
  const timestamp = new Date().toISOString();
  return {
    channel: "slack",
    success: false,
    message: "Slack delivery not yet implemented",
    timestamp
  };
}

export async function deliverTaskResult(
  task: ScheduledTask,
  result: TaskExecutionResult,
  config?: DeliveryConfig
): Promise<DeliveryResult[]> {
  if (!config?.enabled || !config.channels || config.channels.length === 0) {
    return [];
  }

  const results: DeliveryResult[] = [];
  const timestamp = new Date().toISOString();

  const payload = {
    task: {
      id: task.id,
      name: task.name,
      description: task.description
    },
    execution: {
      timestamp,
      ok: result.ok,
      status: result.ok ? "success" : "error",
      error: result.error,
      duration_ms: result.duration_ms,
      session_id: result.session_id
    },
    output: config.includeOutput ? result.output?.slice(0, 5000) : undefined,
    log_path: config.includeLogs ? result.logPath : undefined
  };

  for (const channel of config.channels) {
    try {
      let channelResult: DeliveryResult;

      switch (channel.type) {
        case "webhook": {
          const url = channel.config.url as string | undefined;
          if (!url) {
            channelResult = {
              channel: "webhook",
              success: false,
              message: "Missing webhook URL in config",
              timestamp
            };
          } else {
            channelResult = await sendWebhook(url, payload);
          }
          break;
        }

        case "email": {
          const to = channel.config.to as string | undefined;
          const subject = channel.config.subject as string | undefined;
          if (!to || !subject) {
            channelResult = {
              channel: "email",
              success: false,
              message: "Missing email config (to, subject)",
              timestamp
            };
          } else {
            channelResult = await sendEmail(to, subject, JSON.stringify(payload, null, 2));
          }
          break;
        }

        case "discord": {
          const webhookUrl = channel.config.webhook_url as string | undefined;
          if (!webhookUrl) {
            channelResult = {
              channel: "discord",
              success: false,
              message: "Missing Discord webhook URL in config",
              timestamp
            };
          } else {
            channelResult = await sendDiscord(webhookUrl, payload);
          }
          break;
        }

        case "slack": {
          const webhookUrl = channel.config.webhook_url as string | undefined;
          if (!webhookUrl) {
            channelResult = {
              channel: "slack",
              success: false,
              message: "Missing Slack webhook URL in config",
              timestamp
            };
          } else {
            channelResult = await sendSlack(webhookUrl, payload);
          }
          break;
        }

        default:
          channelResult = {
            channel: channel.type as DeliveryChannelType,
            success: false,
            message: `Unknown delivery channel type: ${channel.type}`,
            timestamp
          };
      }

      results.push(channelResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        channel: channel.type,
        success: false,
        message: `Delivery error: ${message}`,
        timestamp
      });
    }
  }

  return results;
}
