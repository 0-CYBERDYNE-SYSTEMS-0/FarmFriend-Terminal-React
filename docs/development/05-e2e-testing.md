# E2E Testing

**End-to-end testing strategies, procedures, and automation for FF Terminal.**

---

## Overview

End-to-end (E2E) testing validates the complete workflow from user input to agent response, ensuring all components work together correctly. FF Terminal uses a combination of shell scripts, automated test loops, and manual testing procedures.

### E2E Test Scope

| Component | Test Coverage |
|-----------|---------------|
| CLI Entry Points | ✓ |
| WebSocket Daemon | ✓ |
| Tool Execution | ✓ |
| Multi-turn Conversations | ✓ |
| Profile Management | ✓ |
| Web Interface | ✓ |
| Error Recovery | ✓ |

---

## E2E Test Script

### Using the Shell Script

**Location**: `scripts/e2e_loop.sh`

```bash
#!/bin/bash

# E2E Test Script
# Usage: ./scripts/e2e_loop.sh "<profile-name>" <mode> <<'EOT'
# test input
# EOT

PROFILE="${1:-development}"
MODE="${2:-auto}"
TIMEOUT=300

echo "Starting E2E test..."
echo "Profile: $PROFILE"
echo "Mode: $MODE"
echo "Timeout: ${TIMEOUT}s"
echo "---"

# Run the test
timeout ${TIMEOUT} npm run dev:start <<'EOT' | tee e2e_output.log
/mode $MODE
${@:3}
/quit
EOT

# Check results
if grep -q "Error:" e2e_output.log; then
    echo "❌ E2E test FAILED"
    exit 1
else
    echo "✅ E2E test PASSED"
    exit 0
fi
```

### Running E2E Tests

```bash
# Basic test with default profile
./scripts/e2e_loop.sh "development" auto <<'EOT'
Hello
Summarize this repository
EOT

# Test with planning mode
./scripts/e2e_loop.sh "development" planning <<'EOT'
Create a new React component
EOT

# Test with confirm mode
./scripts/e2e_loop.sh "development" confirm <<'EOT'
List all files in the current directory
EOT

# Custom timeout
TIMEOUT=600 ./scripts/e2e_loop.sh "development" auto <<'EOT'
Perform a complex multi-step task
EOT
```

---

## Test Scenarios

### Scenario 1: Basic Conversation

```bash
./scripts/e2e_loop.sh "development" auto <<'EOT'
Hello, who are you?
What can you do?
/quit
EOT
```

**Expected Output**:
- Agent introduces itself
- Lists capabilities
- No errors

### Scenario 2: Tool Execution

```bash
./scripts/e2e_loop.sh "development" auto <<'EOT'
Read the file package.json
Extract the project name
/quit
EOT
```

**Expected Output**:
- readFile tool executes
- Project name extracted correctly
- No errors

### Scenario 3: Multi-turn Conversation

```bash
./scripts/e2e_loop.sh "development" auto <<'EOT'
Create a new file named test.txt with content "hello world"
Now read that file back
Delete the file
/quit
EOT
```

**Expected Output**:
- writeFile tool executes
- readFile tool executes
- deleteFile tool executes
- All operations succeed

### Scenario 4: Mode Switching

```bash
./scripts/e2e_loop.sh "development" auto <<'EOT'
/mode planning
Create a TypeScript function that sorts an array
/mode auto
Execute the plan
/quit
EOT
```

**Expected Output**:
- Plan extracted and displayed
- Plan executed correctly
- No errors

### Scenario 5: Error Handling

```bash
./scripts/e2e_loop.sh "development" auto <<'EOT'
Read a file that doesn't exist: /nonexistent/file.txt
List all available tools
/quit
EOT
```

**Expected Output**:
- Error handled gracefully
- Tool list displayed
- Agent continues to function

### Scenario 6: Web Interface

```bash
# Start web server
npm run dev:web &
WEB_PID=$!

# Wait for server to start
sleep 5

# Test web interface
curl -s http://localhost:8787 > web_response.html

# Check response
if grep -q "FF Terminal" web_response.html; then
    echo "✅ Web interface test PASSED"
else
    echo "❌ Web interface test FAILED"
fi

# Cleanup
kill $WEB_PID
```

---

## Automated E2E Test Suite

### Test Suite Structure

```
e2e/
├── scenarios/
│   ├── basic-conversation.test.sh
│   ├── tool-execution.test.sh
│   ├── multi-turn.test.sh
│   ├── mode-switching.test.sh
│   ├── error-handling.test.sh
│   └── web-interface.test.sh
├── lib/
│   ├── runner.sh
│   └── assertions.sh
└── run-all.sh
```

### Test Runner

**Location**: `e2e/lib/runner.sh`

```bash
#!/bin/bash

# E2E Test Runner

set -e

PROFILE="${1:-development}"
SCENARIO="${2:-all}"
TIMEOUT="${3:-300}"
LOG_DIR="e2e/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $LOG_DIR

run_scenario() {
    local scenario_file=$1
    local scenario_name=$(basename $scenario_file .test.sh)
    local log_file="$LOG_DIR/${scenario_name}_${TIMESTAMP}.log"

    echo "Running: $scenario_name"
    echo "Log: $log_file"

    bash $scenario_file $PROFILE $TIMEOUT | tee $log_file

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ $scenario_name PASSED"
        return 0
    else
        echo "❌ $scenario_name FAILED"
        return 1
    fi
}

if [ "$SCENARIO" == "all" ]; then
    for scenario in e2e/scenarios/*.test.sh; do
        run_scenario $scenario || exit 1
    done
else
    run_scenario "e2e/scenarios/${SCENARIO}.test.sh" || exit 1
fi

echo "All tests passed! ✅"
```

### Running All Tests

```bash
# Run all E2E tests
./e2e/run-all.sh

# Run specific scenario
./e2e/run-all.sh development basic-conversation

# Custom timeout
./e2e/run-all.sh development all 600
```

---

## Assertion Library

### Assertion Functions

**Location**: `e2e/lib/assertions.sh`

```bash
#!/bin/bash

# Assertion Library for E2E Tests

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-Expected to find '$needle' in output}"

    if echo "$haystack" | grep -q "$needle"; then
        return 0
    else
        echo "❌ Assertion failed: $message"
        echo "Output: $haystack"
        return 1
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="${3:-Expected NOT to find '$needle' in output}"

    if ! echo "$haystack" | grep -q "$needle"; then
        return 0
    else
        echo "❌ Assertion failed: $message"
        echo "Output: $haystack"
        return 1
    fi
}

assert_exit_code() {
    local expected=$1
    local actual=$2
    local message="${3:-Expected exit code $expected, got $actual}"

    if [ "$actual" -eq "$expected" ]; then
        return 0
    else
        echo "❌ Assertion failed: $message"
        return 1
    fi
}

assert_file_exists() {
    local file="$1"
    local message="${2:-Expected file $file to exist}"

    if [ -f "$file" ]; then
        return 0
    else
        echo "❌ Assertion failed: $message"
        return 1
    fi
}
```

### Using Assertions

```bash
#!/bin/bash

source e2e/lib/assertions.sh

OUTPUT=$(./scripts/e2e_loop.sh "development" auto <<'EOT'
Hello
EOT
)

# Check assertions
assert_contains "$OUTPUT" "FF Terminal" "Agent introduction"
assert_contains "$OUTPUT" "Claude" "Mentions Claude"
assert_not_contains "$OUTPUT" "Error:" "No errors"
```

---

## WebSocket Testing

### WebSocket Test Script

```bash
#!/bin/bash

# Test WebSocket Connection

DAEMON_PORT="${1:-28888}"
TIMEOUT=10

echo "Testing WebSocket connection on port $DAEMON_PORT..."

# Check if port is listening
if ! lsof -ti:$DAEMON_PORT > /dev/null 2>&1; then
    echo "❌ Daemon not running on port $DAEMON_PORT"
    exit 1
fi

# Test WebSocket handshake using websocat
if command -v websocat &> /dev/null; then
    echo "Testing WebSocket handshake..."

    RESPONSE=$(echo '{"type":"hello","client":"test","version":"1.0.0"}' | \
        websocat ws://localhost:$DAEMON_PORT --text -w 1s)

    if echo "$RESPONSE" | grep -q "hello"; then
        echo "✅ WebSocket handshake successful"
        echo "Response: $RESPONSE"
        exit 0
    else
        echo "❌ WebSocket handshake failed"
        exit 1
    fi
else
    echo "⚠️  websocat not installed, skipping WebSocket test"
    echo "Install with: brew install websocat"
fi
```

### Running WebSocket Tests

```bash
# Start daemon
npm run dev:daemon &
DAEMON_PID=$!

# Wait for daemon to start
sleep 3

# Test WebSocket
./e2e/test-websocket.sh

# Cleanup
kill $DAEMON_PID
```

---

## Performance Testing

### Response Time Test

```bash
#!/bin/bash

# Test Response Time

echo "Testing agent response time..."

START=$(date +%s%N)

OUTPUT=$(./scripts/e2e_loop.sh "development" auto <<'EOT'
Say "test" and nothing else
EOT
)

END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))

echo "Response time: ${DURATION}ms"

if [ $DURATION -lt 5000 ]; then
    echo "✅ Response time acceptable (< 5s)"
    exit 0
else
    echo "❌ Response time too slow (> 5s)"
    exit 1
fi
```

### Memory Usage Test

```bash
#!/bin/bash

# Test Memory Usage

echo "Testing memory usage..."

# Start daemon
npm run dev:daemon &
DAEMON_PID=$!

# Wait for daemon to start
sleep 3

# Get initial memory
MEM_BEFORE=$(ps -o rss= -p $DAEMON_PID)

# Run test
./scripts/e2e_loop.sh "development" auto <<'EOT'
Hello
EOT
> /dev/null

# Get final memory
MEM_AFTER=$(ps -o rss= -p $DAEMON_PID)

# Calculate difference (in MB)
MEM_DIFF=$(( (MEM_AFTER - MEM_BEFORE) / 1024 ))

echo "Memory before: ${MEM_BEFORE}KB"
echo "Memory after: ${MEM_AFTER}KB"
echo "Memory delta: ${MEM_DIFF}MB"

if [ $MEM_DIFF -lt 100 ]; then
    echo "✅ Memory usage acceptable (< 100MB)"
    exit 0
else
    echo "❌ Memory usage too high (> 100MB)"
    exit 1
fi

# Cleanup
kill $DAEMON_PID
```

---

## Concurrency Testing

### Multiple Concurrent Sessions

```bash
#!/bin/bash

# Test Concurrent Sessions

NUM_SESSIONS=5
echo "Testing $NUM_SESSIONS concurrent sessions..."

# Start daemon
npm run dev:daemon &
DAEMON_PID=$!
sleep 3

# Create temporary session files
SESSION_FILES=()
for i in $(seq 1 $NUM_SESSIONS); do
    SESSION_FILES+=("$(mktemp)")
    echo "Session $i test input" > "${SESSION_FILES[$((i-1))]}"
done

# Run tests in parallel
PIDS=()
for i in $(seq 1 $NUM_SESSIONS); do
    (
        SESSION_ID=$(uuidgen)
        INPUT_FILE="${SESSION_FILES[$((i-1))]}"
        OUTPUT=$(cat "$INPUT_FILE" | npm run dev:cli -- --session $SESSION_ID)
        echo "Session $i complete"
    ) &
    PIDS+=($!)
done

# Wait for all sessions
for pid in "${PIDS[@]}"; do
    wait $pid
done

# Cleanup
kill $DAEMON_PID
rm -f "${SESSION_FILES[@]}"

echo "✅ All concurrent sessions completed successfully"
```

---

## Continuous Integration

### GitHub Actions Workflow

**`.github/workflows/e2e.yml`**:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run E2E tests
        run: ./e2e/run-all.sh

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-logs
          path: e2e/logs/
```

### Pre-commit Hook

**`.husky/pre-commit-e2e`**:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run basic E2E tests on pre-commit
./e2e/run-all.sh development basic-conversation || exit 1
```

---

## Troubleshooting

### E2E Tests Fail Intermittently

**Check**:
1. Daemon port availability
2. Network connection
3. File system permissions
4. Memory/disk space

### Tests Timeout

**Solutions**:
```bash
# Increase timeout
TIMEOUT=600 ./e2e/run-all.sh

# Check for hanging processes
ps aux | grep ff-terminal

# Kill hanging processes
pkill -9 -f ff-terminal
```

### WebSocket Connection Fails

**Check**:
```bash
# Verify daemon is running
lsof -ti:28888

# Check port conflicts
lsof -i:28888

# Use different port
export FF_TERMINAL_PORT=28889
```

### Web Interface Tests Fail

**Check**:
```bash
# Verify web server started
curl http://localhost:8787

# Check browser console for errors
# Verify web client is built
ls -la src/web/client/dist/
```

---

## Best Practices

### 1. Isolation

```bash
# Use unique session IDs
SESSION_ID=$(uuidgen)
npm run dev:cli -- --session $SESSION_ID

# Use unique file names
TEST_FILE=$(mktemp /tmp/test_XXXXXX.txt)
```

### 2. Cleanup

```bash
# Always cleanup
cleanup() {
    kill $DAEMON_PID
    rm -f $TEST_FILE
}
trap cleanup EXIT
```

### 3. Logging

```bash
# Save logs for debugging
LOG_FILE="e2e/logs/test_$(date +%Y%m%d_%H%M%S).log"
./e2e/run-all.sh | tee $LOG_FILE
```

### 4. Idempotency

```bash
# Design tests to be repeatable
rm -rf /tmp/test-workspace
mkdir -p /tmp/test-workspace
# ... run tests ...
rm -rf /tmp/test-workspace
```

---

## Resources

- [Vitest E2E Testing](https://vitest.dev/guide/)
- [Playwright E2E Testing](https://playwright.dev/)
- [Shell Scripting Best Practices](https://github.com/google/styleguide/blob/gh-pages/shellguide.md)

---

**Last Updated**: 2026-02-02
