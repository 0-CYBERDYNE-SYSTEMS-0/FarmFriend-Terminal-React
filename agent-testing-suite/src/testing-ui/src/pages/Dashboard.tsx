import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, DashboardMetrics } from "../api";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || "Failed to load dashboard"}</p>
        <button className="btn btn-secondary" onClick={loadMetrics}>Retry</button>
      </div>
    );
  }

  const successRate = (metrics.avg_success_rate * 100).toFixed(1);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Total Runs</h3>
          <p className="text-2xl font-bold">{metrics.total_runs}</p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Passed</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.passed}</p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Failed</h3>
          <p className="text-2xl font-bold text-red-600">{metrics.failed}</p>
        </div>

        <div className="bg-white p-6 rounded shadow-md">
          <h3 className="text-gray-600 mb-2">Avg Success Rate</h3>
          <p className="text-2xl font-bold text-indigo-600">{successRate}%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded shadow-md mb-8">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="space-x-4">
          <button className="btn btn-primary" onClick={() => navigate("/runs")}>
            Run Test Suite
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/runs")}>
            View All Runs
          </button>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white p-6 rounded shadow-md">
        <h3 className="text-xl font-bold mb-4">Recent Test Runs</h3>
        {metrics.recent_runs.length === 0 ? (
          <p className="text-gray-600">No test runs found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Suite</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <a href={`/run/${run.id}`} className="text-indigo-600 hover:underline">
                      {run.id}
                    </a>
                  </td>
                  <td>{run.suite_name}</td>
                  <td>
                    <span className={`badge badge-${run.status}`}>
                      {run.status}
                    </span>
                  </td>
                  <td>{new Date(run.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
