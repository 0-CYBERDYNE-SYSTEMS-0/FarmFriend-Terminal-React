import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import TrendCharts from "../components/TrendCharts";

interface TrendDataPoint {
  date: string;
  value: number;
  runId?: string;
}

export default function Trends() {
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState("success_rate");
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrendData();
  }, [selectedMetric]);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const { data } = await api.getTrend(selectedMetric);

      // Mock data for now
      const mockData = generateMockTrendData(selectedMetric);
      setTrendData(mockData);
    } catch (err: any) {
      setError(err.message || "Failed to load trend data");
    } finally {
      setLoading(false);
    }
  };

  const generateMockTrendData = (metric: string): TrendDataPoint[] => {
    const data: TrendDataPoint[] = [];
    const now = Date.now();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
      const baseValue = getBaseValue(metric);
      const variation = (Math.random() - 0.5) * baseValue * 0.1;

      data.push({
        date: date.toISOString(),
        value: Math.max(0, Math.min(1, baseValue + variation)),
        runId: `run_${i}`
      });
    }

    return data;
  };

  const getBaseValue = (metric: string): number => {
    switch (metric) {
      case "success_rate": return 0.85;
      case "avg_duration": return 5000;
      case "total_tool_calls": return 50;
      case "avg_turns": return 5;
      case "total_errors": return 2;
      default: return 0.5;
    }
  };

  const metricLabel = (metric: string): string => {
    return metric.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const metrics = [
    "success_rate",
    "avg_duration",
    "total_tool_calls",
    "avg_turns",
    "total_errors"
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Trend Analysis</h2>
          <p className="text-gray-600">Track metrics over time</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Metric Selector */}
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h3 className="text-lg font-bold mb-4">Select Metric</h3>
        <div className="grid grid-cols-5 gap-4">
          {metrics.map(metric => (
            <button
              key={metric}
              className={`p-4 rounded border-2 ${
                selectedMetric === metric
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
              onClick={() => setSelectedMetric(metric)}
            >
              <div className="font-medium">{metricLabel(metric)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      {loading ? (
        <div className="text-center py-8">Loading trend data...</div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded shadow-md mb-6">
          <p className="text-red-600">{error}</p>
          <button className="btn btn-secondary mt-4" onClick={loadTrendData}>
            Retry
          </button>
        </div>
      ) : (
        <TrendCharts
          metric={selectedMetric}
          data={trendData}
          label={metricLabel(selectedMetric)}
          color="#4f46e5"
          showConfidence={true}
        />
      )}

      {/* Metrics Summary */}
      <div className="bg-white p-6 rounded shadow-md">
        <h3 className="text-lg font-bold mb-4">Metrics Summary</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Latest</th>
              <th>7-Day Avg</th>
              <th>30-Day Avg</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(metric => {
              const data = generateMockTrendData(metric);
              const latest = data[data.length - 1].value;
              const avg7d = data.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7;
              const avg30d = data.reduce((sum, d) => sum + d.value, 0) / 30;

              let trend = "Stable";
              const change = latest - avg30d;
              if (change > 0.05) trend = "📈 Increasing";
              else if (change < -0.05) trend = "📉 Decreasing";

              return (
                <tr key={metric}>
                  <td>
                    <a
                      href="#"
                      className="text-indigo-600 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedMetric(metric);
                      }}
                    >
                      {metricLabel(metric)}
                    </a>
                  </td>
                  <td>{latest.toFixed(3)}</td>
                  <td>{avg7d.toFixed(3)}</td>
                  <td>{avg30d.toFixed(3)}</td>
                  <td>{trend}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
