# Provider Abstraction

## Overview

FF Terminal supports multiple LLM providers through a unified abstraction layer. The provider interface enables seamless switching between different AI services while maintaining consistent behavior across the application.

## Provider Interface

```typescript
interface Provider {
  name: string;

  streamChat(params: {
    model: string;
    messages: OpenAIMessage[];
    tools?: ToolSchema[];
    tool_choice?: "auto" | "any" | "none" | { type: "function", function: { name: string } };
    temperature?: number;
    maxTokens?: number;
    glmThinkingMode?: "auto" | "enabled" | "disabled";
    signal: AbortSignal;
    sessionId: string;
  }): AsyncGenerator<ProviderEvent>;
}
```

### Provider Events

```typescript
type ProviderEvent =
  | { type: "content"; delta: string }           // Streaming text
  | { type: "thinking"; delta: string }          // Hidden reasoning (Claude)
  | { type: "status"; message: string }         // Status updates
  | { type: "error"; message: string }          // Error occurred
  | { type: "final";                           // Final response
      content: string;
      toolCalls: { id: string; name: string; arguments: unknown }[];
    };
```

## Supported Providers

### 1. OpenRouter

**Config:**
```typescript
{
  provider: "openrouter",
  apiKey: string
}
```

**Usage:**
```bash
export OPENROUTER_API_KEY="sk-..."
ff-terminal start
```

**Features:**
- SSE streaming
- Multi-model support
- Automatic retries

### 2. Z.ai

**Config:**
```typescript
{
  provider: "zai",
  apiKey: string,
  baseUrl?: string  // Default: https://api.z.ai
}
```

**Usage:**
```bash
export ANTHROPIC_AUTH_TOKEN="..."
ff-terminal start
```

**Features:**
- Anthropic-compatible API
- Two modes: Anthropic format or OpenAI format
- High-throughput inference

### 3. MiniMax

**Config:**
```typescript
{
  provider: "minimax",
  apiKey: string,
  baseUrl?: string  // Default: https://api.minimax.io
}
```

**Usage:**
```bash
export MINIMAX_API_KEY="..."
ff-terminal start
```

**Features:**
- Anthropic-compatible API
- Cost-effective inference
- Chinese language optimization

### 4. LM Studio

**Config:**
```typescript
{
  provider: "lmstudio",
  baseUrl: string,  // Default: http://localhost:1234
  apiKey?: string   // Optional
}
```

**Usage:**
```bash
export LM_STUDIO_BASE_URL="http://localhost:1234"
ff-terminal start
```

**Features:**
- Local inference
- OpenAI-compatible API
- Privacy (no data leaves your machine)

### 5. Anthropic Direct

**Config:**
```typescript
{
  provider: "anthropic",
  apiKey: string,
  baseUrl?: string,        // Default: https://api.anthropic.com
  anthropicVersion?: string  // Default: 2023-06-01
}
```

**Usage:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
ff-terminal start
```

**Features:**
- Official Anthropic API
- Extended thinking mode
- Streaming responses

### 6. OpenAI-Compatible

**Config:**
```typescript
{
  provider: "openai-compatible",
  apiKey: string,
  baseUrl: string  // Required
}
```

**Usage:**
```bash
export API_KEY="..."
export OPENAI_BASE_URL="https://..."
ff-terminal start
```

**Features:**
- Any OpenAI-compatible API
- Custom inference endpoints
- Flexible model selection

### 7. Anthropic-Compatible

**Config:**
```typescript
{
  provider: "anthropic-compatible",
  apiKey: string,
  baseUrl: string,           // Required
  anthropicVersion?: string  // Default: 2023-06-01
}
```

**Usage:**
```bash
export API_KEY="..."
export ANTHROPIC_BASE_URL="https://..."
ff-terminal start
```

**Features:**
- Any Anthropic-compatible API
- Extended thinking support
- Custom endpoints

## Provider Factory

```typescript
export function createProvider(params?: {
  repoRoot?: string;
  modelOverride?: string;
}): { provider: Provider; model: string } {
  const cfg = resolveConfig({ repoRoot: params?.repoRoot });

  const model = String(
    params?.modelOverride ||
    process.env.FF_MODEL ||
    cfg.main_model ||
    "openai/gpt-4o-mini"
  );

  const override = String(process.env.FF_PROVIDER || "").trim().toLowerCase();

  // Explicit override
  if (override) {
    return createExplicitProvider(override, model, cfg);
  }

  // Priority order (config)
  if (isEnabled(cfg.use_openrouter)) {
    const apiKey = String(process.env.OPENROUTER_API_KEY || cfg.openrouter_api_key || "");
    if (!apiKey) throw new Error("OpenRouter enabled but API key missing");
    return { provider: openRouterProvider({ apiKey }), model };
  }

  if (isEnabled(cfg.use_zai)) {
    // ... Z.ai initialization
  }

  if (isEnabled(cfg.use_minimax)) {
    // ... MiniMax initialization
  }

  if (isEnabled(cfg.use_lm_studio)) {
    // ... LM Studio initialization
  }

  if (isEnabled(cfg.use_anthropic_direct)) {
    // ... Anthropic initialization
  }

  throw new Error("No provider enabled");
}
```

## Provider Selection Priority

1. **Environment variable override** (`FF_PROVIDER`)
2. **Config flags** (in order)
   - `use_openrouter`
   - `use_zai`
   - `use_minimax`
   - `use_lm_studio`
   - `use_anthropic_direct`

## Model Configuration

### Model Override

```bash
# Environment variable
export FF_MODEL="openai/gpt-4o"

# Or in config
{
  "main_model": "openai/gpt-4o"
}
```

### Per-Profile Models

Profiles support different models for different use cases:

```json
{
  "name": "my-profile",
  "provider": "openrouter",
  "model": "openai/gpt-4o",          // Main chat model
  "subagentModel": "openai/gpt-4o-mini",  // Subagents
  "toolModel": "openai/gpt-4o-mini",     // Tool calls
  "webModel": "openai/gpt-4o-mini",      // Web search
  "imageModel": "openai/dall-e-3",       // Image generation
  "videoModel": "openai/gpt-4o"         // Video analysis
}
```

### GLM Thinking Mode

For GLM models (4.5, 4.6, 4.7):

```bash
export GLM_THINKING_MODE="auto"  # or "enabled" or "disabled"
```

Or in config:
```json
{
  "glm_thinking_mode": "auto"
}
```

**Modes:**
- `auto`: Agent-controlled (default)
- `enabled`: Always enabled
- `disabled`: Always disabled

## Streaming Implementation

### OpenRouter (SSE)

```typescript
export async function* openRouterProvider({
  apiKey,
  model,
  messages,
  tools,
  signal
}): AsyncGenerator<ProviderEvent> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      stream: true
    }),
    signal
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      if (line === "data: [DONE]") break;

      const data = JSON.parse(line.slice(6));

      if (data.choices?.[0]?.delta?.content) {
        yield { type: "content", delta: data.choices[0].delta.content };
      }

      if (data.choices?.[0]?.delta?.tool_calls) {
        yield { type: "tool_calls", toolCalls: data.choices[0].delta.tool_calls };
      }
    }
  }
}
```

### Anthropic (WebSocket)

```typescript
export async function* anthropicProvider({
  apiKey,
  baseUrl,
  model,
  messages,
  tools,
  signal
}): AsyncGenerator<ProviderEvent> {
  const ws = new WebSocket(`${baseUrl.replace("https", "wss")}/v1/messages`);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const request = {
    model,
    max_tokens: 4096,
    messages,
    tools,
    stream: true
  };

  ws.send(JSON.stringify(request));

  const decoder = new TextDecoder();

  return (async function* () {
    let buffer = "";

    for await (const chunk of wsStream(ws)) {
      buffer += decoder.decode(chunk);

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = JSON.parse(line.slice(6));

        if (data.type === "content_block_delta") {
          if (data.delta.type === "text_delta") {
            yield { type: "content", delta: data.delta.text };
          }
        }

        if (data.type === "content_block_stop") {
          // Block complete
        }
      }
    }
  })();
}
```

## Error Handling

### Authentication Errors

```typescript
try {
  const { provider, model } = createProvider();
} catch (err) {
  if (err.message.includes("API_KEY") || err.message.includes("apiKey")) {
    console.error("Authentication failed. Check your API key configuration.");
  }
  throw err;
}
```

### Rate Limiting

Providers handle rate limits differently:

**OpenRouter:** Automatic retries with exponential backoff
**Anthropic:** Returns 429, client should retry
**MiniMax:** Returns 429, client should retry
**LM Studio:** No rate limits (local)

### Timeout Handling

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000); // 60s

try {
  for await (const ev of provider.streamChat({
    signal: controller.signal,
    // ...
  })) {
    // Process events
  }
} finally {
  clearTimeout(timeout);
}
```

## Provider-Specific Features

### Extended Thinking (Anthropic)

```typescript
// Enable extended thinking
const messages: OpenAIMessage[] = [
  {
    role: "user",
    content: "Solve this complex problem..."
  }
];

for await (const ev of provider.streamChat({
  model: "claude-sonnet-4-20250514",
  messages,
  tools,
  signal,
  sessionId
})) {
  if (ev.type === "thinking") {
    // Extended thinking content
    console.log("Thinking:", ev.delta);
  } else if (ev.type === "content") {
    // Final answer
    console.log("Answer:", ev.delta);
  }
}
```

### Tool Choice

```typescript
// Force tool use
tool_choice: "any"  // Must call at least one tool

// Let model decide
tool_choice: "auto"  // Default

// Prevent tool use
tool_choice: "none"

// Force specific tool
tool_choice: {
  type: "function",
  function: { name: "read_file" }
}
```

### Temperature

```typescript
// Lower = more deterministic
temperature: 0.0  // For coding, precise tasks

// Higher = more creative
temperature: 0.7  // For creative writing, brainstorming

// Very high
temperature: 1.0  // For maximum creativity
```

## Configuration Examples

### Development (Local)

```bash
# .env
FF_PROVIDER="lmstudio"
FF_MODEL="mistralai/ministral-3-3b"
LM_STUDIO_BASE_URL="http://localhost:1234"
```

### Production (Cloud)

```bash
# .env
FF_PROVIDER="openrouter"
FF_MODEL="anthropic/claude-3.5-sonnet"
OPENROUTER_API_KEY="sk-or-..."
```

### Cost-Optimized

```bash
# .env
FF_PROVIDER="minimax"
FF_MODEL="claude-3-haiku-20240307"
MINIMAX_API_KEY="..."
```

### Hybrid

```json
{
  "use_openrouter": true,
  "openrouter_api_key": "...",
  "use_lm_studio": true,
  "lm_studio_base_url": "http://localhost:1234"
}
```

Switch at runtime:
```bash
# Use cloud provider
export FF_PROVIDER="openrouter"

# Use local provider
export FF_PROVIDER="lmstudio"
```

## Related Documentation

- [04-execution-flow.md](./04-execution-flow.md) - How providers are used
- [09-tool-registry.md](./09-tool-registry.md) - Tool schemas
- [10-async-context.md](./10-async-context.md) - AbortSignal usage
