import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, TestRun } from "../api";

export default function TestList() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const { runs: data } = await api.listRuns();
      setRuns(data);
    } catch (err: any) {
      console.error("Failed to load runs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = runs.filter(run => {
    if (!filterStatus) return true;
    return run.status === filterStatus;
  });

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
          <button className="btn btn-primary" onClick={() => navigate("/runs/new")}>
            Run New Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow-md mb-6">
        <div className="flex items-center gap-4">
          <label>
            Status:
            <select
              className="ml-2 border rounded p-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
              <option value="running">Running</option>
            </select>
          </label>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded shadow-md">
        {loading ? (
          <div className="text-center py-8">Loading test runs...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Suite Name</th>
                <th>Status</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    No test runs found. Run your first test suite to get started!
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <a href={`/run/${run.id}`} className="text-indigo-600 hover:underline">
                        {run.id}
                      </a>
                    </td>
                    <td>{run.suite_name}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td>{new Date(run.started_at).toLocaleString()}</td>
                    <td>
                      <a href={`/run/${run.id}`} className="text-indigo-600 hover:underline mr-2">
                        View
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
