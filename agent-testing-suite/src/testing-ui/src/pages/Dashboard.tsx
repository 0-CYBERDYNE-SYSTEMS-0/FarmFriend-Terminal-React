import React, { useEffect, useState } from "react";

interface DashboardMetrics {
  total_runs: number;
  passed: number;
  failed: number;
  avg_success_rate: number;
  recent_runs: Array<{
    id: string;
    suite_name: string;
    status: string;
    started_at: string;
  }>;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - will be replaced with actual API
    setTimeout(() => {
      setMetrics({
        total_runs: 12,
        passed: 10,
        failed: 2,
        avg_success_rate: 0.85,
        recent_runs: [
          { id: "run_1", suite_name: "example-coding-tasks", status: "completed", started_at: new Date().toISOString() },
          { id: "run_2", suite_name: "long-horizon-coding", status: "completed", started_at: new Date(Date.now() - 3600000).toISOString() },
          { id: "run_3", suite_name: "tool-usage", status: "partial", started_at: new Date(Date.now() - 7200000).toISOString() },
        ]
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (!metrics) {
    return <div className="text-center py-8">Failed to load dashboard data</div>;
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
          <button className="btn btn-primary">Run Example Suite</button>
          <button className="btn btn-secondary">View All Runs</button>
          <button className="btn btn-secondary">Create New Suite</button>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white p-6 rounded shadow-md">
        <h3 className="text-xl font-bold mb-4">Recent Test Runs</h3>
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
      </div>
    </div>
  );
}
