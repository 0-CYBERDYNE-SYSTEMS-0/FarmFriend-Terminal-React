import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface TestRun {
  id: string;
  suite_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  metrics?: {
    success_rate: number;
    avg_duration_ms: number;
    avg_turns: number;
  };
}

export default function AcademicDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<TestRun[]>([]);
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
        success_rate: ((data.avg_success_rate || 0) * 100).toFixed(2),
        avg_duration: 0,
        avg_turns: 0
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600 mt-4">Loading research dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Agent Research Testing Suite
              </h1>
              <p className="text-sm text-slate-600">v0.1.0 | Research Grade</p>
            </div>
            <nav className="flex items-center gap-6">
              <button onClick={() => navigate("/")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Dashboard
              </button>
              <button onClick={() => navigate("/suites")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Test Suites
              </button>
              <button onClick={() => navigate("/runs")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Test Runs
              </button>
              <button onClick={() => navigate("/analytics")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Analytics
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Research Overview
          </h2>
          <p className="text-slate-600">
            Comprehensive analysis of agent performance across test scenarios
          </p>
        </div>

        {/* Welcome State */}
        {metrics.total_runs === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 mb-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <span className="text-3xl">🔬</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Welcome to Research Dashboard
              </h3>
              <p className="text-slate-600 mb-6">
                No test runs have been executed yet. Begin your research by:
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => navigate("/suites")}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Browse Test Suites
                </button>
                <button
                  onClick={() => navigate("/config")}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Configure Providers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Total Runs
              </h3>
              <span className="p-2 bg-blue-100 rounded-full">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-slate-800">{metrics.total_runs}</p>
            <p className="text-sm text-slate-600 mt-1">All test executions</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Passed Tests
              </h3>
              <span className="p-2 bg-green-100 rounded-full">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-green-600">{metrics.passed}</p>
            <p className="text-sm text-slate-600 mt-1">Successful scenarios</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Failed Tests
              </h3>
              <span className="p-2 bg-red-100 rounded-full">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-red-600">{metrics.failed}</p>
            <p className="text-sm text-slate-600 mt-1">Unsuccessful scenarios</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                Success Rate
              </h3>
              <span className="p-2 bg-indigo-100 rounded-full">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
            </div>
            <p className="text-4xl font-bold text-indigo-600">{metrics.success_rate}%</p>
            <p className="text-sm text-slate-600 mt-1">Overall performance</p>
          </div>
        </div>

        {/* Recent Runs Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              Recent Test Executions
            </h3>
          </div>
          
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-600">No test executions yet.</p>
              <button
                onClick={() => navigate("/suites")}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Start First Test Run
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Test Suite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Executed
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentRuns.map((run, idx) => (
                  <tr key={run.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                        {run.id}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {run.suite_name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        run.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : run.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/run/${run.id}`)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                      >
                        View Analysis →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-sm text-slate-600 text-center">
            Agent Research Testing Suite v0.1.0 | Academic & Research Grade
          </p>
        </div>
      </footer>
    </div>
  );
}
