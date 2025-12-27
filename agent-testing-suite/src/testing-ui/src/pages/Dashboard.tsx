import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getMetrics();
      setMetrics({
        total_runs: data.total_runs || 0,
        passed: data.passed || 0,
        failed: data.failed || 0,
        success_rate: ((data.avg_success_rate || 0) * 100).toFixed(1)
      });
      setRecentRuns(data.recent_runs || []);
    } catch (err: any) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your testing activity</p>
      </div>

      {/* Quick Actions */}
      {metrics.total_runs === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border-2 border-indigo-300">
          <h2 className="text-xl font-bold mb-4">👋 Welcome to Agent Testing Suite!</h2>
          <p className="text-gray-600 mb-6">
            You haven't run any tests yet. Get started by:
          </p>
          <div className="flex gap-4">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/suites")}
            >
              Browse Test Suites →
            </button>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 mb-2">Total Runs</h3>
          <p className="text-3xl font-bold">{metrics.total_runs}</p>
          <p className="text-sm text-gray-500 mt-2">All test executions</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 mb-2">Passed</h3>
          <p className="text-3xl font-bold text-green-600">{metrics.passed}</p>
          <p className="text-sm text-gray-500 mt-2">Successful tests</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 mb-2">Failed</h3>
          <p className="text-3xl font-bold text-red-600">{metrics.failed}</p>
          <p className="text-sm text-gray-500 mt-2">Failed tests</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-gray-600 mb-2">Success Rate</h3>
          <p className="text-3xl font-bold text-indigo-600">{metrics.success_rate}%</p>
          <p className="text-sm text-gray-500 mt-2">Overall performance</p>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Test Runs</h2>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/runs")}
          >
            View All Runs →
          </button>
        </div>
        
        {recentRuns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No test runs yet.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/suites")}
            >
              Run Your First Test Suite
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Run ID</th>
                <th className="text-left py-3 px-2">Suite</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Started</th>
                <th className="text-right py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, idx) => (
                <tr key={run.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {run.id}
                    </code>
                  </td>
                  <td className="py-3 px-2">
                    {run.suite_name || "Unknown"}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      run.status === "completed" 
                        ? "bg-green-100 text-green-700" 
                        : run.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      className="btn btn-primary text-sm"
                      onClick={() => navigate(`/run/${run.id}`)}
                    >
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
