import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  isFailedStatus,
  isPartialStatus,
  isPassedStatus,
  normalizeScenarioStatus
} from "../utils/scenarioStatus";

export default function ResearchResults() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (runId) {
      loadRun();
    }
  }, [runId]);

  const loadRun = async () => {
    try {
      const { run: data } = await api.getRun(runId);
      setRun(data);
    } catch (err: any) {
      console.error("Failed to load run:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-slate-600 mt-4">Loading research results...</p>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Research run not found.</p>
          <button
            onClick={() => navigate("/runs")}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium"
          >
            Browse Runs
          </button>
        </div>
      </div>
    );
  }

  const results = run.results || [];
  const passed = results.filter((r: any) => isPassedStatus(r.status)).length;
  const failed = results.filter((r: any) => isFailedStatus(r.status)).length;
  const partial = results.filter((r: any) => isPartialStatus(r.status)).length;
  const successRate = results.length > 0 ? (passed / results.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Research Results
              </h1>
              <p className="text-sm text-slate-600">Run ID: {runId}</p>
            </div>
            <nav className="flex items-center gap-6">
              <button onClick={() => navigate("/")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Dashboard
              </button>
              <button onClick={() => navigate("/analytics")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Analytics
              </button>
              <button onClick={() => navigate("/runs")} className="text-slate-700 hover:text-indigo-600 font-medium">
                Test Runs
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              Test Execution Summary
            </h2>
            <span className={`inline-flex px-4 py-2 rounded-full text-sm font-bold ${
              run.status === "completed"
                ? "bg-green-100 text-green-700"
                : run.status === "failed"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {run.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                Total Scenarios
              </h3>
              <p className="text-3xl font-bold text-slate-800">{results.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                Passed
              </h3>
              <p className="text-3xl font-bold text-green-600">{passed}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                Failed
              </h3>
              <p className="text-3xl font-bold text-red-600">{failed}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                Partial
              </h3>
              <p className="text-3xl font-bold text-yellow-600">{partial}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                Success Rate
              </h3>
              <p className="text-3xl font-bold text-indigo-600">
                {successRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              Detailed Scenario Results
            </h3>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-600">No scenario results available.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Scenario ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Turns
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((result: any, idx) => {
                  const normalizedStatus = normalizeScenarioStatus(result.status);
                  return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                        {result.scenario_id || result.id}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                      {result.scenario_name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        normalizedStatus === "passed"
                          ? "bg-green-100 text-green-700"
                          : normalizedStatus === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {normalizedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {result.duration_ms 
                        ? `${(result.duration_ms / 1000).toFixed(2)}s`
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {result.turn_count || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {result.evaluation?.score !== undefined ? (
                        <span className={`text-sm font-bold ${
                          result.evaluation.score >= 0.8
                            ? "text-green-600"
                            : result.evaluation.score >= 0.5
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}>
                          {(result.evaluation.score * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">N/A</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Export Options */}
        <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Export Research Data
          </h3>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
              <span>📊</span>
              <span>Download CSV</span>
            </button>
            <button className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              <span>📈</span>
              <span>Download JSON</span>
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
              <span>📄</span>
              <span>Generate PDF Report</span>
            </button>
            <button
              onClick={() => navigate(`/review/${runId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>👁️</span>
              <span>Human Review</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
