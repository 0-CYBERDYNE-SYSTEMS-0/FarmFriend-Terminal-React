import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, TestRun } from "../api";
import {
  getScenarioBadgeClass,
  isFailedStatus,
  isPassedStatus,
  normalizeScenarioStatus
} from "../utils/scenarioStatus";
import { getDisplayMode } from "../utils/displayMode";

export default function TestRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [run, setRun] = useState<TestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (runId) {
      loadRun();
    }
  }, [runId]);

  const loadRun = async () => {
    try {
      const { run: data } = await api.getRun(runId!);
      setRun(data);
    } catch (err: any) {
      setError(err.message || "Failed to load test run");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading test run details...</div>;
  }

  if (error || !run) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || "Test run not found"}</p>
      </div>
    );
  }

  const results = run.results || [];

  const passedCount = results.filter(r => isPassedStatus(r.status)).length;
  const failCount = results.filter(r => isFailedStatus(r.status)).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);
  const metrics = run.metrics;
  const isVerbose = getDisplayMode() === "verbose";

  return (
    <div>
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{run.id}</h2>
            <p className="text-gray-600">{run.suite_name}</p>
          </div>
          <span className={`badge badge-${run.status}`}>
            {run.status}
          </span>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Started: {new Date(run.started_at).toLocaleString()}</p>
          {run.completed_at && (
            <p>Completed: {new Date(run.completed_at).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Total Scenarios</h3>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Passed</h3>
          <p className="text-2xl font-bold text-green-600">{passedCount}</p>
        </div>
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Failed</h3>
          <p className="text-2xl font-bold text-red-600">{failCount}</p>
        </div>
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Total Duration</h3>
          <p className="text-2xl font-bold">{(totalDuration / 1000).toFixed(1)}s</p>
        </div>
      </div>

      {isVerbose && metrics && (
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded shadow-md">
            <h3 className="text-gray-600 mb-2">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600">
              {(metrics.success_rate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-6 rounded shadow-md">
            <h3 className="text-gray-600 mb-2">Total Turns</h3>
            <p className="text-2xl font-bold">{metrics.total_turns}</p>
          </div>
          <div className="bg-white p-6 rounded shadow-md">
            <h3 className="text-gray-600 mb-2">Tool Calls</h3>
            <p className="text-2xl font-bold">{metrics.total_tool_calls}</p>
          </div>
          <div className="bg-white p-6 rounded shadow-md">
            <h3 className="text-gray-600 mb-2">Errors</h3>
            <p className="text-2xl font-bold text-red-600">{metrics.total_errors}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-md">
        <h3 className="text-xl font-bold mb-4">Scenario Results</h3>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Status</th>
              {isVerbose && (
                <>
                  <th>Turns</th>
                  <th>Tool Calls</th>
                </>
              )}
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, idx) => (
              <tr key={idx}>
                <td>{result.scenario_name}</td>
                <td>
                  <span className={`badge ${getScenarioBadgeClass(result.status)}`}>
                    {normalizeScenarioStatus(result.status)}
                  </span>
                </td>
                {isVerbose && (
                  <>
                    <td>{result.turn_count ?? "N/A"}</td>
                    <td>{result.tool_calls ?? "N/A"}</td>
                  </>
                )}
                <td>{(result.duration_ms / 1000).toFixed(1)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isVerbose && metrics && (
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
              {Object.entries(metrics.tool_usage || {}).map(([toolName, usage]: [string, any]) => (
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
      )}
    </div>
  );
}
