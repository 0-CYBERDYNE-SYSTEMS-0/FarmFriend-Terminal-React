# Agent Testing Suite

World-class AI agent testing and evaluation framework for ff-terminal.

## Overview

This testing suite provides:
- **Long-horizon task evaluation** - Test complex multi-step agent workflows
- **A/B testing** - Compare models, prompts, and configurations
- **Comprehensive metrics** - Success rates, tool usage, performance KPIs
- **Web UI** - Visual dashboard for running tests and viewing results
- **Rich reports** - HTML reports with charts, Mermaid diagrams, and knowledge graphs

## Quick Start

### 1. Install Dependencies

```bash
cd agent-testing-suite
npm install
npm install --prefix src/testing-ui
```

### 2. Initialize Testing Workspace

```bash
npm run build
npm run dev init
```

This creates the testing workspace structure:
```
ff-terminal-workspace/tests/
├── suites/
│   ├── library/    # Built-in test suites
│   └── custom/     # User-defined suites
├── runs/          # Test run artifacts
├── reports/        # Generated reports
└── trends.json     # Historical metrics
```

### 3. Run a Test Suite

```bash
npm run dev run example-coding-tasks
```

### 4. View Results

```bash
# List all runs
npm run dev list

# View details
npm run dev report <run-id>
```

### 5. Start Web UI

```bash
# From agent-testing-suite directory
cd src/testing-ui
npm install
npm run dev
```

Visit http://localhost:3000

## CLI Commands

### `ff-test init`
Initialize testing workspace directory structure.

### `ff-test run <suite>`
Run a test suite.
- `-p, --profile <name>` - Profile to use (default: env)
- `--session-prefix <prefix>` - Prefix for session IDs
- `--dry-run` - Simulate without executing
- `--parallel <number>` - Run scenarios in parallel

### `ff-test run-all`
Run all test suites.

### `ff-test list`
List all test runs with status and dates.

### `ff-test report <run-id>`
Generate detailed report for a test run.

### `ff-test compare <run1> <run2>`
Compare two test runs (A/B testing).

### `ff-test create-suite`
Interactive test suite creator (coming soon).

### `ff-test serve`
Start web UI on specified port (default: 3000).

## Test Suite Format

Test suites are defined in YAML format:

```yaml
name: my-test-suite
description: Tests agent behavior on specific task
category: long-horizon
version: 1.0.0

scenarios:
  - name: simple-task
    description: What this scenario tests
    prompts:
      - "First prompt"
      - "Second prompt"
    evaluation:
      rubric: basic-completion
      assertions:
        - type: output
          condition: contains
          expected: "expected text"
        - type: filesystem
          condition: file_exists
          expected: "filename.txt"
      human_review: false
    timeout_minutes: 10
    expected_duration_minutes: 5
```

### Categories

- `long-horizon` - Complex multi-step tasks
- `tool-usage` - Tool-specific behavior tests
- `reasoning` - Chain-of-thought quality tests
- `safety` - Guardrail effectiveness tests

### Assertion Types

- `output` - Match expected content in agent output
- `filesystem` - Check files created/modified
- `tool_pattern` - Validate tool usage patterns
- `duration` - Enforce time limits
- `exit_code` - Check process exit codes

## Metrics

### Task-Level Metrics
- **Success Rate** - Percentage of successful tool calls
- **Completion Rate** - Percentage of completed turns
- **Avg Duration** - Average time per turn

### Tool-Level Metrics
- **Call Count** - Number of times each tool was used
- **Success Rate** - Percentage of successful executions
- **Avg Duration** - Average time per execution
- **Error Types** - Categorized failure reasons

### System-Level Metrics
- **Circuit Breaker Trips** - Number of safety triggers
- **Plan Validation Events** - Plan extraction and validation

## Project Structure

```
agent-testing-suite/
├── src/
│   ├── bin/
│   │   └── ff-test.ts           # CLI entry point
│   ├── testing/
│   │   ├── e2eRunner.ts        # Core test runner
│   │   ├── suites/
│   │   │   ├── library/           # Built-in suites
│   │   │   └── testSuite.schema.json
│   │   ├── metrics/
│   │   │   ├── logParser.ts       # JSONL log parser
│   │   │   ├── metricsCalculator.ts
│   │   │   └── comparator.ts      # A/B comparison
│   │   ├── evaluation/
│   │   │   ├── evaluators/       # Assertion evaluators
│   │   │   └── rubrics/          # Evaluation rubrics
│   │   ├── reports/
│   │   │   ├── htmlReportGenerator.ts
│   │   │   ├── mermaidGenerator.ts
│   │   │   └── dashboardGenerator.ts
│   │   └── types.ts             # Shared interfaces
│   └── testing-ui/                # Vite + React web UI
│       ├── src/
│       │   ├── components/         # Dashboard, Charts, Tables
│       │   └── pages/            # Route pages
│       └── package.json
├── tests/                         # Test suite tests
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
npm run format
```

## Phase Roadmap

### ✅ Phase 1 (Current)
- TypeScript E2E runner
- Log parser and metrics calculator
- Test suite schema and examples
- CLI scaffolding
- Basic web UI

### 🚧 Phase 2
- Automated evaluators (output, filesystem, duration)
- HTML report generator with Mermaid
- A/B comparison CLI
- Web UI: Test suite editor

### 🔜 Phase 3
- Knowledge graph visualization (D3.js)
- Trend tracking over time
- Parallel test execution
- Custom evaluator plugins
- Human review workflow

### 🔜 Phase 4
- CI/CD integration
- Export formats (PDF, CSV)
- Comprehensive documentation
- Performance optimization
- Full test suite library

## Extension Points

### Add Custom Evaluator

Create `src/testing/evaluation/evaluators/myEvaluator.ts`:

```typescript
export const myEvaluator: Evaluator = {
  name: 'my-check',
  evaluate: async (result: ScenarioResult, context: any) => {
    // Your evaluation logic
    return {
      passed: true,
      score: 1.0,
      criteria_results: [],
      human_review_required: false
    };
  }
};
```

### Add Custom Rubric

Create YAML in `src/testing/suites/rubrics/`:

```yaml
id: custom-rubric
name: My Custom Evaluation
scoring: scale1-5
criteria:
  - dimension: correctness
    weight: 0.6
    description: Output matches expected
  - dimension: efficiency
    weight: 0.4
    description: Minimal tool usage
```

## License

Same as parent ff-terminal project.
