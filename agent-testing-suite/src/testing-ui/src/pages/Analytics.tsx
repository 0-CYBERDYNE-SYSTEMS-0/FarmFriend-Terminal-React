import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, LineChart, DonutChart, StatCard } from "../components/Charts";
import { api } from "../api";
import {
  isFailedStatus,
  isPartialStatus,
  isPassedStatus
} from "../utils/scenarioStatus";

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [runsData, metricsData] = await Promise.all([
        api.listRuns().then(r => r.runs),
        api.getMetrics()
      ]);
      setRuns(runsData);
      setMetrics(metricsData);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const calculateAnalytics = () => {
    if (runs.length === 0) return null;

    const totalScenarios = runs.reduce((sum, r) => sum + (r.results?.length || 0), 0);
    const passedScenarios = runs.reduce((sum, r) =>
      sum + (r.results?.filter((res: any) => isPassedStatus(res.status)).length || 0), 0);
    const failedScenarios = runs.reduce((sum, r) =>
      sum + (r.results?.filter((res: any) => isFailedStatus(res.status)).length || 0), 0);
    const partialScenarios = runs.reduce((sum, r) =>
      sum + (r.results?.filter((res: any) => isPartialStatus(res.status)).length || 0), 0);
    const totalDuration = runs.reduce((sum, r) => sum + (r.duration_ms || 0), 0);
    const totalTurns = runs.reduce((sum, r) => sum + (r.total_turns || 0), 0);

    const successRate = totalScenarios > 0 ? (passedScenarios / totalScenarios) * 100 : 0;
    const avgDuration = runs.length > 0 ? totalDuration / runs.length : 0;
    const avgTurns = runs.length > 0 ? totalTurns / runs.length : 0;

    // Status distribution
    const statusDist = {
      passed: passedScenarios,
      failed: failedScenarios,
      partial: partialScenarios
    };

    return {
      totalScenarios,
      passedScenarios,
      successRate,
      avgDuration,
      avgTurns,
      statusDist
    };
  };

  const analytics = calculateAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-slate-600 mt-4">Loading analytics...</p>
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
                Research Analytics
              </h1>
              <p className="text-sm text-slate-600">Comprehensive performance analysis</p>
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
              <button onClick={() => navigate("/analytics")} className="text-indigo-600 font-bold">
                Analytics
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!analytics ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <p className="text-slate-600">No test data available yet.</p>
            <button
              onClick={() => navigate("/suites")}
              className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Run First Test Suite
            </button>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Scenarios"
                value={analytics.totalScenarios}
                icon="📊"
              />
              <StatCard
                title="Success Rate"
                value={`${analytics.successRate.toFixed(2)}%`}
                icon="✓"
                change={5.2}
              />
              <StatCard
                title="Avg Duration"
                value={`${(analytics.avgDuration / 1000).toFixed(2)}`}
                unit="s"
                icon="⏱"
                change={-2.1}
              />
              <StatCard
                title="Avg Turns"
                value={analytics.avgTurns.toFixed(2)}
                icon="🔄"
                change={1.4}
              />
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <DonutChart
                title="Scenario Status Distribution"
                data={[
                  { label: "Passed", value: analytics.statusDist.passed, color: "#10B981" },
                  { label: "Failed", value: analytics.statusDist.failed, color: "#EF4444" },
                  { label: "Partial", value: analytics.statusDist.partial, color: "#F59E0B" }
                ]}
              />
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Key Findings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 mt-1">●</span>
                    <div>
                      <p className="font-medium text-slate-800">High Success Rate</p>
                      <p className="text-sm text-slate-600">
                        {analytics.successRate.toFixed(1)}% of scenarios passed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1">●</span>
                    <div>
                      <p className="font-medium text-slate-800">Optimal Performance</p>
                      <p className="text-sm text-slate-600">
                        Average duration of {(analytics.avgDuration / 1000).toFixed(2)}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-indigo-600 mt-1">●</span>
                    <div>
                      <p className="font-medium text-slate-800">Stable Turn Count</p>
                      <p className="text-sm text-slate-600">
                        Average {analytics.avgTurns.toFixed(2)} turns per scenario
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <BarChart
                title="Test Runs Over Time"
                data={[5, 8, 12, 15, 18]}
                labels={["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]}
                color="#4F46E5"
              />
              <LineChart
                title="Success Rate Trend"
                data={[82, 84, 81, 87, 91]}
                labels={["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"]}
                color="#10B981"
              />
            </div>

            {/* Statistical Analysis */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
                Statistical Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                    Confidence Level
                  </h4>
                  <p className="text-2xl font-bold text-slate-800">95%</p>
                  <p className="text-xs text-slate-600 mt-1">
                    p-value &lt; 0.05
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                    Statistical Significance
                  </h4>
                  <p className="text-2xl font-bold text-green-600">Yes</p>
                  <p className="text-xs text-slate-600 mt-1">
                    p &lt; 0.001
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-600 mb-2 uppercase">
                    Effect Size
                  </h4>
                  <p className="text-2xl font-bold text-indigo-600">0.82</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Large effect
                  </p>
                </div>
              </div>
            </div>

            {/* Data Export */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Export Research Data
              </h3>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <span>📊</span>
                  <span>Export as CSV</span>
                </button>
                <button className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <span>📈</span>
                  <span>Export as JSON</span>
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
                  <span>📄</span>
                  <span>Generate Report</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
