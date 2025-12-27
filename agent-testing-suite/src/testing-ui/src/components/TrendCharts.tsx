import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface TrendDataPoint {
  date: string;
  value: number;
  runId?: string;
}

interface TrendChartsProps {
  metric: string;
  data: TrendDataPoint[];
  label?: string;
  color?: string;
  showConfidence?: boolean;
}

export default function TrendCharts({
  metric,
  data,
  label,
  color = "#4f46e5",
  showConfidence = true
}: TrendChartsProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.date)) as [Date, Date])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .range([height - margin.bottom, margin.top]);

    // Calculate confidence interval (95%)
    const rollingMean = calculateRollingMean(data, 7); // 7-day rolling average
    const stdDev = calculateStdDev(data, rollingMean);

    // Create line generator
    const line = d3.line<TrendDataPoint>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    // Create area generator (for confidence interval)
    const areaUpper = d3.line<TrendDataPoint>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.value + 1.96 * stdDev[data.indexOf(d)!]));

    const areaLower = d3.line<TrendDataPoint>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.value - 1.96 * stdDev[data.indexOf(d)!]));

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y-%m-%d")));

    // Add Y axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    // Add confidence interval area
    if (showConfidence) {
      svg.append("path")
        .datum(data)
        .attr("fill", color)
        .attr("fill-opacity", 0.1)
        .attr("d", d3.area()
          .x((d) => x(new Date(d.date)))
          .y0((d) => y(d.value - 1.96 * stdDev[data.indexOf(d)!]))
          .y1((d) => y(d.value + 1.96 * stdDev[data.indexOf(d)!]))
        );
    }

    // Add trend line
    svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add data points
    svg.selectAll<SVGCircleElement, TrendDataPoint>("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => x(new Date(d.date)))
      .attr("cy", (d) => y(d.value))
      .attr("r", 4)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .append("title")
      .text((d) => `${label || metric}: ${d.value.toFixed(3)}\nDate: ${d.date}\nRun ID: ${d.runId || "N/A"}`);

    // Add trend line (simple linear regression)
    const regression = calculateLinearRegression(data);
    if (regression) {
      const trendLine = d3.line<[number, number]>()
        .x((d) => x(d3.scaleLinear().range(x.range())(d[0])))
        .y((d) => y(d[0] * d[1] + d[2]))
        .curve(d3.curveMonotoneX);

      const xExtent = d3.extent(data, (d) => new Date(d.date)) as [Date, Date];
      const trendData = xExtent.map(date => {
        const timestamp = date.getTime();
        const predictedY = regression.slope * timestamp + regression.intercept;
        return [timestamp / 1000, predictedY];
      });

      svg.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", trendLine);
    }

  }, [data, metric, label, color, showConfidence, svgRef]);

  // Helper functions
  const calculateRollingMean = (data: TrendDataPoint[], window: number): number[] => {
    return data.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const end = i + 1;
      const subset = data.slice(start, end);
      const mean = subset.reduce((sum, d) => sum + d.value, 0) / subset.length;
      return mean;
    });
  };

  const calculateStdDev = (data: TrendDataPoint[], means: number[]): number[] => {
    return data.map((d, i) => {
      const subset = data.slice(Math.max(0, i - 7 + 1), i + 1);
      const mean = means[i];
      const variance = subset.reduce((sum, val) => sum + Math.pow(val.value - mean, 2), 0) / subset.length;
      return Math.sqrt(variance);
    });
  };

  const calculateLinearRegression = (data: TrendDataPoint[]) => {
    if (data.length < 2) return null;

    const n = data.length;
    const timestamps = data.map(d => new Date(d.date).getTime());
    const values = data.map(d => d.value);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += timestamps[i];
      sumY += values[i];
      sumXY += timestamps[i] * values[i];
      sumX2 += timestamps[i] * timestamps[i];
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  return (
    <div className="trend-charts-container">
      <style>{`
        .trend-charts-container {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          background: #f9fafb;
        }
      `}</style>
      <h3 className="text-lg font-bold mb-4">{label || metric} Trend</h3>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "300px",
          backgroundColor: "#fff"
        }}
      />
      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Latest Value:</strong> {data[data.length - 1].value.toFixed(3)}</p>
          <p><strong>Change (7-day avg):</strong> {((data[data.length - 1].value - data[Math.max(0, data.length - 8)].value)).toFixed(3)}</p>
          <p><strong>Trend:</strong> {calculateTrendDirection(data)}</p>
        </div>
      )}
    </div>
  );
}

function calculateTrendDirection(data: TrendDataPoint[]): string {
  if (data.length < 2) return "Insufficient data";

  const recent = data.slice(-7);
  const older = data.slice(-14, -7);

  const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;

  const change = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (change > 5) return "📈 Increasing rapidly";
  if (change > 1) return "📈 Increasing";
  if (change < -5) return "📉 Decreasing rapidly";
  if (change < -1) return "📉 Decreasing";
  return "➡️ Stable";
}
