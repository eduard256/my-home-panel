# Claude Code API Gateway - Complete Documentation

## Table of Contents
- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [SSE Stream Format](#sse-stream-format)
- [Tool Results Parsing](#tool-results-parsing)
- [Session Management](#session-management)
- [Token Usage & Context](#token-usage--context)
- [Error Handling](#error-handling)
- [Complete Examples](#complete-examples)

---

## Overview

Claude Code API Gateway is a stateless HTTP/SSE proxy that wraps the Claude Code CLI, providing:
- Server-Sent Events (SSE) streaming
- Multiple parallel requests support
- Session management (resume/continue)
- Process control (start/cancel)
- Full JSON output proxying without modifications

**Architecture:**
```
Client → API Gateway → Claude Code CLI → Anthropic API
   ↓                                           ↓
session_id ←──────────────────────────────────┘
```

**Base URL:** `http://localhost:9876` or `http://10.99.10.106:9876`

---

## API Endpoints

### GET /health

Health check endpoint.

**Request:**
```bash
curl -u admin:password http://localhost:9876/health
```

**Response:**
```json
{
  "status": "ok",
  "claude_path": "/home/user/.local/bin/claude",
  "claude_version": "2.0.56 (Claude Code)"
}
```

**Status Codes:**
- `200` - Service is healthy
- `500` - Service error

---

### POST /chat

Execute Claude Code with SSE streaming.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | User prompt/instruction |
| `cwd` | string | ✅ | Working directory (absolute path) |
| `model` | string | ❌ | Model: `sonnet`, `opus`, `haiku` (default: sonnet) |
| `session_id` | string | ❌ | Session ID for continuation (resume) |
| `system_prompt` | string | ❌ | Replace system prompt |
| `append_system_prompt` | string | ❌ | Append to system prompt |
| `tools` | string[] | ❌ | List of tools to enable |
| `allowed_tools` | string[] | ❌ | Whitelist of allowed tools |
| `disallowed_tools` | string[] | ❌ | Blacklist of disallowed tools |
| `permission_mode` | string | ❌ | Permission mode |
| `mcp_config` | string[] | ❌ | MCP configuration |
| `add_dir` | string[] | ❌ | Additional directories |
| `debug` | bool/string | ❌ | Debug mode |
| `json_schema` | object | ❌ | JSON Schema for output |
| `agents` | object | ❌ | Custom agents configuration |

**Example Request:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create hello.txt with Hello World",
    "cwd": "/home/user/projects"
  }'
```

**Response:** SSE Stream (see [SSE Stream Format](#sse-stream-format))

**Status Codes:**
- `200` - Stream started successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `500` - Internal server error

---

### DELETE /chat/{process_id}

Cancel running process.

**Request:**
```bash
curl -X DELETE http://localhost:9876/chat/{process_id} \
  -u admin:password
```

**Response:**
```json
{
  "status": "cancelled",
  "process_id": "uuid-here"
}
```

**Status Codes:**
- `200` - Process cancelled
- `404` - Process not found
- `401` - Unauthorized

**Important:** Cancelling a process does NOT delete the session from Anthropic API. You can resume it later using the `session_id`.

---

### GET /processes

List all active processes.

**Request:**
```bash
curl -u admin:password http://localhost:9876/processes
```

**Response:**
```json
{
  "processes": [
    {
      "process_id": "uuid-process-id",
      "cwd": "/home/user/project",
      "model": "sonnet",
      "started_at": "2025-12-02T15:28:35.084741",
      "session_id": "uuid-session-id"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

## Authentication

Uses HTTP Basic Authentication.

**Credentials:**
- Username: `admin`
- Password: configured in `.env` file

**Example:**
```bash
# Using -u flag
curl -u admin:password http://localhost:9876/health

# Using Authorization header
curl -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ=" \
     http://localhost:9876/health
```

---

## SSE Stream Format

Server-Sent Events (SSE) format with `event` and `data` fields.

### Event Types

1. **System Init** - First message with session metadata
2. **Assistant Messages** - Claude's text responses and tool calls
3. **User Messages** - Tool execution results
4. **Result Summary** - Final statistics and cost
5. **Done** - Stream completion marker
6. **Ping** - Keepalive messages

---

### 1. System Init Event

**Format:**
```
event: message
data: {JSON}
```

**JSON Structure:**
```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2",
  "cwd": "/home/user/test",
  "tools": [
    "Task", "Bash", "Glob", "Grep", "ExitPlanMode",
    "Read", "Edit", "Write", "NotebookEdit", "WebFetch",
    "TodoWrite", "WebSearch", "BashOutput", "KillShell",
    "Skill", "SlashCommand", "EnterPlanMode"
  ],
  "mcp_servers": [],
  "model": "claude-sonnet-4-5-20250929",
  "permissionMode": "bypassPermissions",
  "slash_commands": [
    "compact", "context", "cost", "init", "pr-comments",
    "release-notes", "todos", "review", "security-review", "plan"
  ],
  "apiKeySource": "none",
  "claude_code_version": "2.0.56",
  "output_style": "default",
  "agents": ["general-purpose", "statusline-setup", "Explore", "Plan"],
  "skills": [],
  "plugins": [],
  "uuid": "unique-event-id"
}
```

**Key Fields:**
- `session_id` - **IMPORTANT:** Save this for session continuation
- `tools` - List of available tools
- `model` - Active Claude model
- `claude_code_version` - CLI version

---

### 2. Assistant Message Events

**Text Response:**
```json
{
  "type": "assistant",
  "message": {
    "model": "claude-sonnet-4-5-20250929",
    "id": "msg_xxx",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "I'll create the file for you."
      }
    ],
    "stop_reason": null,
    "stop_sequence": null,
    "usage": {
      "input_tokens": 2,
      "cache_creation_input_tokens": 3333,
      "cache_read_input_tokens": 13542,
      "output_tokens": 3,
      "service_tier": "standard",
      "cache_creation": {
        "ephemeral_5m_input_tokens": 3333,
        "ephemeral_1h_input_tokens": 0
      }
    },
    "context_management": null
  },
  "parent_tool_use_id": null,
  "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2",
  "uuid": "unique-event-id"
}
```

**Tool Use:**
```json
{
  "type": "assistant",
  "message": {
    "content": [
      {
        "type": "tool_use",
        "id": "toolu_01WAaJtL7QmM2FrXCCzmP1G7",
        "name": "Write",
        "input": {
          "file_path": "/home/user/test/test.txt",
          "content": "Hello from Claude"
        }
      }
    ],
    "usage": { /* token usage */ }
  },
  "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2"
}
```

**Tool Names:**
- `Write` - Create/overwrite file
- `Read` - Read file contents
- `Edit` - Edit existing file
- `Bash` - Execute shell command
- `Glob` - Search files by pattern
- `Grep` - Search file contents
- `TodoWrite` - Manage todo list
- `Task` - Launch subagent
- `WebFetch` - Fetch URL content
- `WebSearch` - Search the web

---

### 3. User Message Events (Tool Results)

**Format:**
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [
      {
        "tool_use_id": "toolu_01WAaJtL7QmM2FrXCCzmP1G7",
        "type": "tool_result",
        "content": "File created successfully at: /home/user/test/test.txt"
      }
    ]
  },
  "parent_tool_use_id": null,
  "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2",
  "uuid": "unique-event-id",
  "tool_use_result": {
    /* Detailed tool-specific result (see Tool Results Parsing) */
  }
}
```

**Key Fields:**
- `content` - Human-readable result text
- `tool_use_result` - Structured, tool-specific data
- `tool_use_id` - Links back to the tool_use request

---

### 4. Result Summary Event

Final event with complete statistics.

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "duration_ms": 67480,
  "duration_api_ms": 79178,
  "num_turns": 14,
  "result": "Text summary of what was accomplished",
  "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2",
  "total_cost_usd": 0.1338811,
  "usage": {
    "input_tokens": 38,
    "cache_creation_input_tokens": 5836,
    "cache_read_input_tokens": 247757,
    "output_tokens": 1707,
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    },
    "service_tier": "standard",
    "cache_creation": {
      "ephemeral_1h_input_tokens": 0,
      "ephemeral_5m_input_tokens": 5836
    }
  },
  "modelUsage": {
    "claude-haiku-4-5-20251001": {
      "inputTokens": 2950,
      "outputTokens": 283,
      "cacheReadInputTokens": 0,
      "cacheCreationInputTokens": 0,
      "webSearchRequests": 0,
      "costUSD": 0.004365,
      "contextWindow": 200000
    },
    "claude-sonnet-4-5-20250929": {
      "inputTokens": 38,
      "outputTokens": 1707,
      "cacheReadInputTokens": 247757,
      "cacheCreationInputTokens": 5836,
      "webSearchRequests": 0,
      "costUSD": 0.12193109999999997,
      "contextWindow": 200000
    }
  },
  "permission_denials": [],
  "uuid": "unique-event-id"
}
```

**Key Metrics:**
- `total_cost_usd` - Total API cost
- `duration_ms` - Client-side duration
- `num_turns` - Number of conversation turns
- `usage` - Aggregated token usage
- `modelUsage` - Per-model breakdown

---

### 5. Done Event

Stream completion marker.

```
event: done
data: {"process_id": "7d171f57-9a84-4b19-926e-2a72d2f700a7"}
```

**After this event, the SSE stream closes.**

---

### 6. Ping Events

Keepalive messages to prevent connection timeout.

```
: ping - 2025-12-02 15:31:19.705901+00:00
```

**These are comments (start with `:`) and can be ignored.**

---

## Tool Results Parsing

Each tool returns specific structured data in `tool_use_result` field.

### Write Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Write",
  "input": {
    "file_path": "/home/user/test/test.txt",
    "content": "Hello from Claude"
  }
}
```

**Result:**
```json
{
  "type": "create",
  "filePath": "/home/user/test/test.txt",
  "content": "Hello from Claude",
  "structuredPatch": [],
  "originalFile": null
}
```

**Fields:**
- `type` - `"create"` for new files, `"edit"` for modifications
- `filePath` - Absolute path to created file
- `content` - File contents
- `originalFile` - Previous content (null for new files)

---

### Read Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Read",
  "input": {
    "file_path": "/home/user/test/test.txt"
  }
}
```

**Result:**
```json
{
  "type": "text",
  "file": {
    "filePath": "/home/user/test/test.txt",
    "content": "Hello from Claude",
    "numLines": 1,
    "startLine": 1,
    "totalLines": 1
  }
}
```

**Fields:**
- `file.content` - File contents
- `file.numLines` - Lines returned
- `file.totalLines` - Total lines in file
- `file.startLine` - Starting line number (for partial reads)

---

### Edit Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Edit",
  "input": {
    "file_path": "/home/user/test/test.txt",
    "old_string": "Hello from Claude",
    "new_string": "Greetings from Claude"
  }
}
```

**Result:**
```json
{
  "filePath": "/home/user/test/test.txt",
  "oldString": "Hello from Claude",
  "newString": "Greetings from Claude",
  "originalFile": "Hello from Claude",
  "structuredPatch": [
    {
      "oldStart": 1,
      "oldLines": 1,
      "newStart": 1,
      "newLines": 1,
      "lines": [
        "-Hello from Claude",
        "\\\\No newline at end of file",
        "+Greetings from Claude",
        "\\\\No newline at end of file"
      ]
    }
  ],
  "userModified": false,
  "replaceAll": false
}
```

**Fields:**
- `originalFile` - Complete original content
- `structuredPatch` - Unified diff format
- `userModified` - Whether user modified file during execution
- `replaceAll` - Whether all occurrences were replaced

---

### Bash Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Bash",
  "input": {
    "command": "ls -la",
    "description": "List all files in directory"
  }
}
```

**Result:**
```json
{
  "stdout": "total 12\\ndrwxrwxr-x  2 user user 4096...",
  "stderr": "",
  "interrupted": false,
  "isImage": false
}
```

**Fields:**
- `stdout` - Standard output
- `stderr` - Standard error
- `interrupted` - Whether command was interrupted
- `isImage` - Whether output is binary image data

---

### Glob Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Glob",
  "input": {
    "pattern": "*.txt"
  }
}
```

**Result:**
```json
{
  "filenames": ["/home/user/test/test.txt"],
  "durationMs": 341,
  "numFiles": 1,
  "truncated": false
}
```

**Fields:**
- `filenames` - Array of matching file paths (absolute)
- `numFiles` - Count of matches
- `truncated` - Whether results were truncated
- `durationMs` - Search duration

---

### Grep Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "Grep",
  "input": {
    "pattern": "Greetings",
    "output_mode": "content"
  }
}
```

**Result:**
```json
{
  "mode": "content",
  "numFiles": 0,
  "filenames": [],
  "content": "test.txt:1:Greetings from Claude",
  "numLines": 1
}
```

**Output Modes:**
- `content` - Shows matching lines with context
- `files_with_matches` - Shows only file paths
- `count` - Shows match counts per file

**Fields:**
- `content` - Matching lines (format: `file:line:content`)
- `filenames` - Files with matches
- `numLines` - Number of matching lines

---

### TodoWrite Tool

**Input:**
```json
{
  "type": "tool_use",
  "name": "TodoWrite",
  "input": {
    "todos": [
      {
        "content": "Review project documentation",
        "status": "pending",
        "activeForm": "Reviewing project documentation"
      },
      {
        "content": "Write unit tests",
        "status": "in_progress",
        "activeForm": "Writing unit tests"
      }
    ]
  }
}
```

**Result:**
```json
{
  "oldTodos": [],
  "newTodos": [
    {
      "content": "Review project documentation",
      "status": "pending",
      "activeForm": "Reviewing project documentation"
    },
    {
      "content": "Write unit tests",
      "status": "in_progress",
      "activeForm": "Writing unit tests"
    }
  ]
}
```

**Todo Statuses:**
- `pending` - Not started
- `in_progress` - Currently working on
- `completed` - Finished

**Fields:**
- `oldTodos` - Previous todo list
- `newTodos` - Updated todo list

---

## Session Management

Sessions enable context persistence across multiple API calls.

### How Sessions Work

**Architecture:**
```
Request 1 (new) → API Gateway → Claude CLI → Anthropic API
                                                    ↓
                                          Creates session
                                          Stores history
                                                    ↓
                                          Returns session_id
                      ↓
            Save session_id
                      ↓
Request 2 (resume) → API Gateway → Claude CLI --resume {session_id} → Anthropic API
                                                                              ↓
                                                                    Loads full history
                                                                    Continues context
```

**Session Storage:**
- ❌ NOT stored in API Gateway (stateless)
- ❌ NOT stored in Claude Code CLI (no persistence)
- ✅ Stored in Anthropic API servers

---

### Creating New Session

**Request:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a website for Abou Bakery",
    "cwd": "/home/user/project"
  }'
```

**First SSE Message:**
```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "0bf104e5-8260-491f-800d-0923669fb9fb",
  ...
}
```

**⚠️ IMPORTANT:** Save this `session_id` for later use!

---

### Resuming Session

**Request:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What did I ask you before?",
    "cwd": "/home/user/project",
    "session_id": "0bf104e5-8260-491f-800d-0923669fb9fb"
  }'
```

**Claude will have full context:**
- All previous messages
- All tool executions
- All created files
- Full conversation history

**Response Example:**
```json
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "text",
      "text": "You asked me to create a website for Abou Bakery."
    }]
  }
}
```

---

### Session Lifecycle

**Timeline:**
```
0:00 - Create session (first request)
       session_id: abc123

0:30 - Continue working (resume with abc123)
       Add new features

1:00 - Cancel process (DELETE /chat/{process_id})
       ⚠️ Session NOT deleted!

2:00 - Resume later (resume with abc123)
       Full context still available

[Hours later]
       Session expires on Anthropic servers
       session_id becomes invalid
```

**Session Expiration:**
- Sessions stored for several hours (exact time not documented)
- After expiration: `session_id` becomes invalid
- No automatic cleanup or notification

---

### Session Use Cases

**1. Long-running tasks:**
```bash
# Start
POST /chat {"prompt": "Build a complex app", "cwd": "/tmp"}
# → session_id: "abc"

# Work for 20 minutes...

# Stop for lunch
DELETE /chat/{process_id}

# Resume after lunch
POST /chat {"prompt": "Continue", "cwd": "/tmp", "session_id": "abc"}
```

**2. Connection failures:**
```bash
# Request starts
POST /chat {"prompt": "Deploy app", "cwd": "/tmp"}
# → session_id: "abc"

# Network dies mid-execution...

# Reconnect and resume
POST /chat {"prompt": "Continue deployment", "cwd": "/tmp", "session_id": "abc"}
```

**3. Iterative development:**
```bash
# Create initial version
POST /chat {"prompt": "Create login page", "cwd": "/tmp"}
# → session_id: "abc"

# Add features iteratively
POST /chat {"prompt": "Add OAuth", "cwd": "/tmp", "session_id": "abc"}
POST /chat {"prompt": "Add 2FA", "cwd": "/tmp", "session_id": "abc"}
POST /chat {"prompt": "Add password reset", "cwd": "/tmp", "session_id": "abc"}
```

**4. Context queries:**
```bash
# Do some work
POST /chat {"prompt": "Create files X, Y, Z", "cwd": "/tmp"}
# → session_id: "abc"

# Ask about history
POST /chat {"prompt": "What files did you create?", "cwd": "/tmp", "session_id": "abc"}
POST /chat {"prompt": "Show me the changes", "cwd": "/tmp", "session_id": "abc"}
```

---

### Important Notes

**⚠️ Security:**
- `session_id` is NOT encrypted or authenticated
- Anyone with the ID can access/continue the session
- No way to revoke or delete a session
- Sessions contain full conversation history

**⚠️ Working Directory:**
- `cwd` is NOT saved in session
- Must specify same `cwd` when resuming
- Claude remembers file paths relative to original `cwd`

**⚠️ Session Listing:**
- No endpoint to list your sessions
- Client must track `session_id` values
- No way to query session status/expiration

---

## Token Usage & Context

Understanding token consumption and context limits.

### Context Window

**Model Limits:**
- Claude Sonnet 4.5: **200,000 tokens**
- Claude Opus 4.5: **200,000 tokens**
- Claude Haiku 4.5: **200,000 tokens**

**Token Types:**
- `input_tokens` - New input tokens (full price)
- `output_tokens` - Generated tokens
- `cache_read_input_tokens` - Read from cache (~10x cheaper)
- `cache_creation_input_tokens` - Written to cache

---

### Token Usage in Responses

**Per-Message Usage (Assistant Messages):**
```json
{
  "type": "assistant",
  "message": {
    "usage": {
      "input_tokens": 2,
      "cache_creation_input_tokens": 3333,
      "cache_read_input_tokens": 13542,
      "output_tokens": 3,
      "service_tier": "standard",
      "cache_creation": {
        "ephemeral_5m_input_tokens": 3333,
        "ephemeral_1h_input_tokens": 0
      }
    }
  }
}
```

**Aggregate Usage (Result Summary):**
```json
{
  "type": "result",
  "total_cost_usd": 0.1338811,
  "usage": {
    "input_tokens": 38,
    "cache_creation_input_tokens": 5836,
    "cache_read_input_tokens": 247757,
    "output_tokens": 1707,
    "server_tool_use": {
      "web_search_requests": 0,
      "web_fetch_requests": 0
    }
  },
  "modelUsage": {
    "claude-sonnet-4-5-20250929": {
      "inputTokens": 38,
      "outputTokens": 1707,
      "cacheReadInputTokens": 247757,
      "cacheCreationInputTokens": 5836,
      "costUSD": 0.12193109999999997,
      "contextWindow": 200000
    }
  }
}
```

---

### Calculating Remaining Context

```python
def calculate_context_usage(usage_data):
    """Calculate token usage and remaining context."""

    # Total tokens consumed
    total_tokens = (
        usage_data["input_tokens"] +
        usage_data["output_tokens"] +
        usage_data["cache_read_input_tokens"] +
        usage_data["cache_creation_input_tokens"]
    )

    # Context window (from modelUsage)
    context_window = 200000  # for Sonnet 4.5

    # Remaining context
    remaining = context_window - total_tokens

    # Percentage used
    percent_used = (total_tokens / context_window) * 100

    return {
        "total_tokens": total_tokens,
        "remaining_tokens": remaining,
        "percent_used": percent_used,
        "context_window": context_window
    }
```

**Example:**
```python
usage = {
    "input_tokens": 38,
    "output_tokens": 1707,
    "cache_read_input_tokens": 247757,
    "cache_creation_input_tokens": 5836
}

result = calculate_context_usage(usage)
# {
#   "total_tokens": 255338,
#   "remaining_tokens": -55338,  # ⚠️ Over limit!
#   "percent_used": 127.67,
#   "context_window": 200000
# }
```

---

### Cost Calculation

**Pricing (approximate, check Anthropic docs for current rates):**

**Claude Sonnet 4.5:**
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- Cache read: $0.30 per 1M tokens (10x cheaper)
- Cache write: $3.75 per 1M tokens

**Formula:**
```python
def calculate_cost(usage):
    """Calculate cost in USD."""

    input_cost = (usage["input_tokens"] / 1_000_000) * 3.00
    output_cost = (usage["output_tokens"] / 1_000_000) * 15.00
    cache_read_cost = (usage["cache_read_input_tokens"] / 1_000_000) * 0.30
    cache_write_cost = (usage["cache_creation_input_tokens"] / 1_000_000) * 3.75

    total = input_cost + output_cost + cache_read_cost + cache_write_cost

    return {
        "input_cost": input_cost,
        "output_cost": output_cost,
        "cache_read_cost": cache_read_cost,
        "cache_write_cost": cache_write_cost,
        "total_cost": total
    }
```

**Example:**
```python
usage = {
    "input_tokens": 38,
    "output_tokens": 1707,
    "cache_read_input_tokens": 247757,
    "cache_creation_input_tokens": 5836
}

cost = calculate_cost(usage)
# {
#   "input_cost": 0.000114,
#   "output_cost": 0.025605,
#   "cache_read_cost": 0.074327,
#   "cache_write_cost": 0.021885,
#   "total_cost": 0.121931  # Matches API's 0.1219 USD
# }
```

---

### Cache Behavior

**Cache Types:**
- `ephemeral_5m_input_tokens` - 5-minute cache (most common)
- `ephemeral_1h_input_tokens` - 1-hour cache

**How Caching Works:**

1. **First Request (cache miss):**
   ```json
   {
     "input_tokens": 5000,
     "cache_creation_input_tokens": 5000,
     "cache_read_input_tokens": 0,
     "output_tokens": 100
   }
   ```

2. **Second Request (cache hit):**
   ```json
   {
     "input_tokens": 50,
     "cache_creation_input_tokens": 50,
     "cache_read_input_tokens": 5000,  // ← Read from cache!
     "output_tokens": 100
   }
   ```

**Benefits:**
- ✅ Massive cost savings for repeated context
- ✅ Faster response times
- ✅ Essential for long sessions

---

### Monitoring Context Usage

**Python Example:**
```python
import json

class ContextMonitor:
    def __init__(self, context_window=200000):
        self.context_window = context_window
        self.total_tokens = 0
        self.total_cost = 0.0

    def process_event(self, event_data):
        """Process SSE event and update metrics."""

        if event_data.get("type") == "result":
            usage = event_data["usage"]

            # Update totals
            self.total_tokens = (
                usage["input_tokens"] +
                usage["output_tokens"] +
                usage["cache_read_input_tokens"] +
                usage["cache_creation_input_tokens"]
            )
            self.total_cost = event_data["total_cost_usd"]

            # Calculate remaining
            remaining = self.context_window - self.total_tokens
            percent_used = (self.total_tokens / self.context_window) * 100

            return {
                "total_tokens": self.total_tokens,
                "remaining_tokens": remaining,
                "percent_used": f"{percent_used:.2f}%",
                "total_cost_usd": f"${self.total_cost:.4f}",
                "warning": remaining < 10000
            }

    def get_status(self):
        """Get current status."""
        remaining = self.context_window - self.total_tokens
        return {
            "used": self.total_tokens,
            "remaining": remaining,
            "limit": self.context_window,
            "cost": self.total_cost
        }

# Usage
monitor = ContextMonitor()

for line in sse_stream:
    if line.startswith("data: "):
        data = json.loads(line[6:])

        if data.get("type") == "result":
            status = monitor.process_event(data)

            if status["warning"]:
                print("⚠️ Warning: Low context remaining!")
                print(f"Remaining: {status['remaining_tokens']} tokens")
```

---

## Error Handling

### HTTP Error Codes

**401 Unauthorized:**
```json
{
  "detail": "Unauthorized"
}
```
**Cause:** Invalid credentials
**Solution:** Check username/password

**404 Not Found:**
```json
{
  "detail": "Process not found: {process_id}"
}
```
**Cause:** Process already completed or invalid ID
**Solution:** Check process still running via GET /processes

**400 Bad Request:**
```json
{
  "detail": "Invalid request body"
}
```
**Cause:** Malformed JSON or missing required fields
**Solution:** Validate request schema

**500 Internal Server Error:**
```json
{
  "detail": "Internal server error"
}
```
**Cause:** Server-side error
**Solution:** Check server logs, retry request

---

### SSE Error Events

**Error Result:**
```json
{
  "type": "result",
  "subtype": "error",
  "is_error": true,
  "error": "Error message here",
  "session_id": "...",
  "duration_ms": 1234
}
```

**Tool Execution Errors:**
```json
{
  "type": "user",
  "message": {
    "content": [{
      "tool_use_id": "...",
      "type": "tool_result",
      "content": "Error: File not found",
      "is_error": true
    }]
  }
}
```

---

### Common Error Scenarios

**1. Invalid session_id:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -d '{"prompt": "test", "cwd": "/tmp", "session_id": "invalid"}'
```

**Response:** Stream starts but Claude has no context.

**2. Working directory doesn't exist:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -d '{"prompt": "test", "cwd": "/nonexistent"}'
```

**Response:**
```json
{
  "type": "result",
  "subtype": "error",
  "is_error": true,
  "error": "Directory not found: /nonexistent"
}
```

**3. Permission denied:**
```bash
curl -X POST http://localhost:9876/chat \
  -u admin:password \
  -d '{"prompt": "Read /etc/shadow", "cwd": "/tmp"}'
```

**Tool Result:**
```json
{
  "type": "user",
  "message": {
    "content": [{
      "type": "tool_result",
      "content": "Error: Permission denied",
      "is_error": true
    }]
  }
}
```

**4. Context limit exceeded:**

When approaching 200K token limit, Claude may:
- Start dropping old context
- Produce summarized responses
- Fail to recall early conversation

**Solution:** Start new session or use context pruning.

---

### Error Handling Best Practices

**1. Retry Logic:**
```python
import time
import requests

def api_request_with_retry(url, data, max_retries=3):
    """Make API request with exponential backoff."""

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                json=data,
                auth=("admin", "password"),
                stream=True,
                timeout=30
            )

            if response.status_code == 200:
                return response

            if response.status_code >= 500:
                # Server error, retry
                wait_time = 2 ** attempt
                time.sleep(wait_time)
                continue

            # Client error, don't retry
            response.raise_for_status()

        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise

    raise Exception(f"Max retries ({max_retries}) exceeded")
```

**2. Stream Error Handling:**
```python
def process_sse_stream(response):
    """Process SSE stream with error handling."""

    try:
        for line in response.iter_lines():
            if not line:
                continue

            line = line.decode("utf-8")

            if line.startswith(": ping"):
                continue

            if line.startswith("event: "):
                event_type = line[7:]
                continue

            if line.startswith("data: "):
                try:
                    data = json.loads(line[6:])

                    # Check for errors
                    if data.get("type") == "result":
                        if data.get("is_error"):
                            print(f"❌ Error: {data.get('error')}")
                            return None

                    yield data

                except json.JSONDecodeError as e:
                    print(f"⚠️ JSON parse error: {e}")
                    continue

    except Exception as e:
        print(f"❌ Stream error: {e}")
        raise
```

**3. Tool Result Validation:**
```python
def validate_tool_result(result_data):
    """Validate tool execution result."""

    if "tool_use_result" not in result_data:
        return None

    tool_result = result_data["tool_use_result"]

    # Check for execution errors
    if result_data["message"]["content"][0].get("is_error"):
        error_msg = result_data["message"]["content"][0]["content"]
        raise ToolExecutionError(error_msg)

    return tool_result
```

---

## Complete Examples

### Example 1: Basic File Creation

**Request:**
```python
import requests
import json

url = "http://localhost:9876/chat"
auth = ("admin", "password")

request_data = {
    "prompt": "Create a file called hello.txt with 'Hello World'",
    "cwd": "/tmp"
}

response = requests.post(
    url,
    auth=auth,
    json=request_data,
    stream=True
)

session_id = None

for line in response.iter_lines():
    if not line:
        continue

    line = line.decode("utf-8")

    if line.startswith("data: "):
        data = json.loads(line[6:])

        # Save session_id from first message
        if data.get("type") == "system":
            session_id = data["session_id"]
            print(f"Session ID: {session_id}")

        # Print assistant messages
        if data.get("type") == "assistant":
            for item in data["message"]["content"]:
                if item["type"] == "text":
                    print(f"Claude: {item['text']}")

        # Print result
        if data.get("type") == "result":
            print(f"Result: {data['result']}")
            print(f"Cost: ${data['total_cost_usd']:.4f}")

print(f"\nSession ID for resume: {session_id}")
```

**Output:**
```
Session ID: ee9196ed-af8a-47a9-9f92-797762bc45a2
Claude: I'll create the file for you.
Result: Created hello.txt with "Hello World"
Cost: $0.0123

Session ID for resume: ee9196ed-af8a-47a9-9f92-797762bc45a2
```

---

### Example 2: Session Resume

```python
import requests
import json

# Resume previous session
url = "http://localhost:9876/chat"
auth = ("admin", "password")

request_data = {
    "prompt": "What file did you create before?",
    "cwd": "/tmp",
    "session_id": "ee9196ed-af8a-47a9-9f92-797762bc45a2"
}

response = requests.post(url, auth=auth, json=request_data, stream=True)

for line in response.iter_lines():
    if not line:
        continue

    line = line.decode("utf-8")

    if line.startswith("data: "):
        data = json.loads(line[6:])

        if data.get("type") == "assistant":
            for item in data["message"]["content"]:
                if item["type"] == "text":
                    print(f"Claude: {item['text']}")
```

**Output:**
```
Claude: I created a file called hello.txt with the content "Hello World".
```

---

### Example 3: Tool Execution Tracking

```python
import requests
import json
from datetime import datetime

class ClaudeClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.auth = (username, password)
        self.session_id = None
        self.tools_used = []

    def execute(self, prompt, cwd, session_id=None):
        """Execute prompt and track tool usage."""

        url = f"{self.base_url}/chat"
        request_data = {
            "prompt": prompt,
            "cwd": cwd
        }

        if session_id:
            request_data["session_id"] = session_id

        response = requests.post(
            url,
            auth=self.auth,
            json=request_data,
            stream=True,
            timeout=300
        )

        for line in response.iter_lines():
            if not line:
                continue

            line = line.decode("utf-8")

            if line.startswith("data: "):
                data = json.loads(line[6:])

                # Save session ID
                if data.get("type") == "system":
                    self.session_id = data["session_id"]

                # Track tool usage
                if data.get("type") == "assistant":
                    for item in data["message"]["content"]:
                        if item["type"] == "tool_use":
                            self.tools_used.append({
                                "tool": item["name"],
                                "input": item["input"],
                                "timestamp": datetime.now().isoformat()
                            })

                # Print results
                if data.get("type") == "result":
                    return {
                        "result": data["result"],
                        "cost": data["total_cost_usd"],
                        "duration_ms": data["duration_ms"],
                        "session_id": data["session_id"],
                        "tools_used": self.tools_used
                    }

    def get_session_id(self):
        """Get current session ID."""
        return self.session_id

# Usage
client = ClaudeClient("http://localhost:9876", "admin", "password")

# Execute task
result = client.execute(
    prompt="Create index.html and style.css for a bakery website",
    cwd="/tmp/bakery"
)

print(f"Result: {result['result']}")
print(f"Cost: ${result['cost']:.4f}")
print(f"Duration: {result['duration_ms']}ms")
print(f"Session: {result['session_id']}")
print(f"\nTools used:")
for tool in result['tools_used']:
    print(f"  - {tool['tool']}: {tool['input']}")

# Continue session
result2 = client.execute(
    prompt="Add a menu section with 3 items",
    cwd="/tmp/bakery",
    session_id=client.get_session_id()
)
```

---

### Example 4: Process Management

```python
import requests
import json
import time

class ProcessManager:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.auth = (username, password)

    def start_process(self, prompt, cwd):
        """Start new process and return immediately."""
        url = f"{self.base_url}/chat"

        response = requests.post(
            url,
            auth=self.auth,
            json={"prompt": prompt, "cwd": cwd},
            stream=True
        )

        # Get session_id from first message
        for line in response.iter_lines():
            if not line:
                continue

            line = line.decode("utf-8")

            if line.startswith("data: "):
                data = json.loads(line[6:])

                if data.get("type") == "system":
                    session_id = data["session_id"]

                    # Get process_id
                    time.sleep(1)
                    processes = self.list_processes()

                    for proc in processes:
                        if proc["session_id"] == session_id:
                            return proc["process_id"], session_id

        return None, None

    def list_processes(self):
        """List all active processes."""
        url = f"{self.base_url}/processes"
        response = requests.get(url, auth=self.auth)
        return response.json()["processes"]

    def cancel_process(self, process_id):
        """Cancel running process."""
        url = f"{self.base_url}/chat/{process_id}"
        response = requests.delete(url, auth=self.auth)
        return response.json()

# Usage
manager = ProcessManager("http://localhost:9876", "admin", "password")

# Start long-running task
process_id, session_id = manager.start_process(
    prompt="Build a complete web application",
    cwd="/tmp/webapp"
)

print(f"Started process: {process_id}")
print(f"Session ID: {session_id}")

# Work for a while...
time.sleep(10)

# List active processes
processes = manager.list_processes()
print(f"\nActive processes: {len(processes)}")
for proc in processes:
    print(f"  - {proc['process_id']} ({proc['model']})")

# Cancel if needed
manager.cancel_process(process_id)
print(f"\nCancelled process: {process_id}")

# Resume later
# ... use session_id to continue
```

---

### Example 5: Real-time Token Monitoring

```python
import requests
import json

class TokenMonitor:
    def __init__(self):
        self.context_window = 200000
        self.current_usage = 0
        self.total_cost = 0.0

    def process_stream(self, url, auth, request_data):
        """Process stream and monitor tokens."""

        response = requests.post(
            url,
            auth=auth,
            json=request_data,
            stream=True
        )

        for line in response.iter_lines():
            if not line:
                continue

            line = line.decode("utf-8")

            if line.startswith("data: "):
                data = json.loads(line[6:])

                # Update on each assistant message
                if data.get("type") == "assistant":
                    usage = data["message"].get("usage", {})
                    tokens = (
                        usage.get("input_tokens", 0) +
                        usage.get("output_tokens", 0) +
                        usage.get("cache_read_input_tokens", 0) +
                        usage.get("cache_creation_input_tokens", 0)
                    )

                    self.current_usage += tokens
                    remaining = self.context_window - self.current_usage
                    percent = (self.current_usage / self.context_window) * 100

                    print(f"\r📊 Tokens: {self.current_usage:,} / {self.context_window:,} ({percent:.1f}%) | Remaining: {remaining:,}", end="")

                # Final stats
                if data.get("type") == "result":
                    self.total_cost = data["total_cost_usd"]
                    print(f"\n\n✅ Complete!")
                    print(f"   Total tokens: {self.current_usage:,}")
                    print(f"   Total cost: ${self.total_cost:.4f}")
                    print(f"   Cache read: {data['usage']['cache_read_input_tokens']:,}")

# Usage
monitor = TokenMonitor()

monitor.process_stream(
    url="http://localhost:9876/chat",
    auth=("admin", "password"),
    request_data={
        "prompt": "Create a complex web application with multiple pages",
        "cwd": "/tmp/app"
    }
)
```

**Output:**
```
📊 Tokens: 45,237 / 200,000 (22.6%) | Remaining: 154,763

✅ Complete!
   Total tokens: 45,237
   Total cost: $0.0567
   Cache read: 32,156
```

---

## Summary

**Key Takeaways:**

1. **SSE Streaming:** All responses are Server-Sent Events with structured JSON
2. **Tool Results:** Each tool has specific result format in `tool_use_result`
3. **Session Management:** Save `session_id` from first message for resuming
4. **Token Tracking:** Monitor usage from each message and final result
5. **Process Control:** Use process_id to cancel, session_id to resume
6. **Error Handling:** Check `is_error` flags and implement retry logic

**Best Practices:**

- ✅ Always save `session_id` from first SSE message
- ✅ Monitor token usage to avoid context overflow
- ✅ Implement exponential backoff for retries
- ✅ Handle SSE parsing errors gracefully
- ✅ Track tool execution for debugging
- ✅ Use context caching for long sessions
- ⚠️ Never expose `session_id` publicly
- ⚠️ Validate tool results before using
- ⚠️ Keep same `cwd` when resuming sessions

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
**API Version:** Claude Code 2.0.56
