import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface ScenarioResult {
  scenario_name: string;
  status: string;
  duration_ms: number;
  turn_count: number;
  tool_calls: number;
  errors: string[];
}

export default function TestRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [runId]);

  if (loading) {
    return <div className="text-center py-8">Loading test run details...</div>;
  }

  // Mock data - will be replaced with API call
  const run = {
    id: runId,
    suite_name: "example-coding-tasks",
    status: "completed",
    started_at: new Date().toISOString(),
    completed_at: new Date(Date.now() + 120000).toISOString(),
    metrics: {
      success_rate: 0.92,
      completion_rate: 1.0,
      avg_duration_ms: 40000,
      avg_iterations: 2.3,
      avg_tool_calls: 8.5,
      total_turns: 4,
      total_tool_calls: 34,
      total_errors: 3,
      tool_usage: {
        "read_file": { call_count: 12, success_count: 12, fail_count: 0 },
        "write_file": { call_count: 3, success_count: 3, fail_count: 0 },
        "grep": { call_count: 8, success_count: 8, fail_count: 0 },
        "glob": { call_count: 5, success_count: 5, fail_count: 0 },
        "run_command": { call_count: 6, success_count: 6, fail_count: 0 }
      }
    },
    results: [
      {
        scenario_name: "read-and-summarize",
        status: "passed",
        duration_ms: 35000,
        turn_count: 2,
        tool_calls: 5,
        errors: []
      },
      {
        scenario_name: "file-creation",
        status: "passed",
        duration_ms: 28000,
        turn_count: 1,
        tool_calls: 2,
        errors: []
      },
      {
        scenario_name: "multi-turn-conversation",
        status: "passed",
        duration_ms: 57000,
        turn_count: 3,
        tool_calls: 15,
        errors: []
      }
    ] as ScenarioResult[]
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "passed": return "badge-success";
      case "failed": return "badge-failed";
      case "partial": return "badge-partial";
      default: return "";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{run.id}</h2>
            <p className="text-gray-600">{run.suite_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`badge badge-${run.status}`}>
              {run.status}
            </span>
            <button className="btn btn-primary">Generate Report</button>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Started: {new Date(run.started_at).toLocaleString()}</p>
          <p>Completed: {new Date(run.completed_at!).toLocaleString()}</p>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Success Rate</h3>
          <p className="text-2xl font-bold text-green-600">
            {(run.metrics!.success_rate * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Total Turns</h3>
          <p className="text-2xl font-bold">{run.metrics!.total_turns}</p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Tool Calls</h3>
          <p className="text-2xl font-bold">{run.metrics!.total_tool_calls}</p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Errors</h3>
          <p className="text-2xl font-bold text-red-600">{run.metrics!.total_errors}</p>
        </div>
      </div>

      {/* Scenario Results */}
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h3 className="text-xl font-bold mb-4">Scenario Results</h3>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Status</th>
              <th>Turns</th>
              <th>Tool Calls</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {run.results.map((result, idx) => (
              <tr key={idx}>
                <td>{result.scenario_name}</td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(result.status)}`}>
                    {result.status}
                  </span>
                </td>
                <td>{result.turn_count}</td>
                <td>{result.tool_calls}</td>
                <td>{(result.duration_ms / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tool Usage */}
      <div className="bg-white p-6 rounded shadow-md">
        <h3 className="text-xl font-bold mb-4">Tool Usage</h3>
        <table>
          <thead>
            <tr>
              <th>Tool</th>
              <th>Calls</th>
              <th>Success</th>
              <th>Failures</th>
              <th>Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(run.metrics!.tool_usage).map(([toolName, usage]: [string, any]) => (
              <tr key={toolName}>
                <td>{toolName}</td>
                <td>{usage.call_count}</td>
                <td>{usage.success_count}</td>
                <td>{usage.fail_count}</td>
                <td>{usage.avg_duration_ms.toFixed(0)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Placeholder for Mermaid chart */}
      <div className="bg-white p-6 rounded shadow-md mt-6">
        <h3 className="text-xl font-bold mb-4">Execution Flow</h3>
        <p className="text-gray-600 italic">
          Mermaid flowchart will be rendered here (Phase 2)
        </p>
      </div>
    </div>
  );
}
