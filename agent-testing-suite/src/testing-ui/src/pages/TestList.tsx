import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface TestRun {
  id: string;
  suite_name: string;
  status: "completed" | "failed" | "partial" | "running";
  started_at: string;
  completed_at?: string;
}

export default function TestList() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setRuns([
        {
          id: "run_1735320000_a1b2c3d4e",
          suite_name: "example-coding-tasks",
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date(Date.now() + 60000).toISOString()
        },
        {
          id: "run_1735310000_f5e6d7c8b",
          suite_name: "long-horizon-coding",
          status: "failed",
          started_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: "run_1735300000_g9h0i1j2k",
          suite_name: "tool-usage",
          status: "partial",
          started_at: new Date(Date.now() - 7200000).toISOString()
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading test runs...</div>;
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "badge-success";
      case "failed": return "badge-failed";
      case "partial": return "badge-partial";
      case "running": return "badge-running";
      default: return "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Test Runs</h2>
        <div className="space-x-4">
          <button className="btn btn-primary">Run New Test</button>
          <button className="btn btn-secondary">Export Results</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow-md mb-6">
        <div className="flex items-center gap-4">
          <label>
            Status:
            <select className="ml-2 border rounded p-2">
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
              <option value="running">Running</option>
            </select>
          </label>
          <label>
            Suite:
            <select className="ml-2 border rounded p-2">
              <option value="">All</option>
              <option value="example-coding-tasks">Example Coding Tasks</option>
              <option value="long-horizon-coding">Long Horizon Coding</option>
            </select>
          </label>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded shadow-md">
        <table>
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Suite Name</th>
              <th>Status</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8">
                  No test runs found. Run your first test suite to get started!
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link to={`/run/${run.id}`} className="text-indigo-600 hover:underline">
                      {run.id}
                    </Link>
                  </td>
                  <td>{run.suite_name}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(run.status)}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>{new Date(run.started_at).toLocaleString()}</td>
                  <td>
                    {run.completed_at
                      ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                      : "-"}
                  </td>
                  <td>
                    <Link to={`/run/${run.id}`} className="text-indigo-600 hover:underline mr-2">
                      View
                    </Link>
                    <button className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
