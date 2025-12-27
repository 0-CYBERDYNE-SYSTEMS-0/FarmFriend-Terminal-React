import { promises as fs } from "node:fs";
import path from "node:path";
import { TestRun, Metrics } from "../types.js";

/**
 * Trend tracking and analysis
 * Detects regressions, improvements, and anomalies
 * Inspired by Galileo's Pareto analysis and Elastic's monitoring
 */

interface TrendDataPoint {
  run_id: string;
  timestamp: string;
  value: number;
  metadata?: any;
}

interface Trend {
  metric_name: string;
  data: TrendDataPoint[];
  rolling_mean_7d?: number;
  rolling_mean_30d?: number;
  trend_direction: "increasing" | "decreasing" | "stable";
  rate_of_change?: number;  // per day
}

interface AnomalyAlert {
  timestamp: string;
  metric_name: string;
  run_id: string;
  expected_value: number;
  actual_value: number;
  deviation: number;
  severity: "low" | "medium" | "high";
}

interface RegressionDetection {
  metric: string;
  detected: boolean;
  significance: number;  // p-value
  change_magnitude: number;  // percent change
  baseline_period: [string, string];
  test_period: [string, string];
}

export class TrendAnalyzer {
  private workspaceDir: string;
  private trendsDir: string;
  private alertsFile: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
    this.trendsDir = path.join(workspaceDir, "tests", "trends");
    this.alertsFile = path.join(this.trendsDir, "alerts.json");
  }

  /**
   * Initialize trend storage
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.trendsDir, { recursive: true });

    // Create alerts file if not exists
    try {
      await fs.access(this.alertsFile);
    } catch {
      await fs.writeFile(this.alertsFile, JSON.stringify([]));
    }
  }

  /**
   * Add data point to trend
   */
  async addDataPoint(
    metricName: string,
    runId: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    const trendFile = path.join(this.trendsDir, `${metricName}.json`);

    let trend: Trend;

    try {
      const content = await fs.readFile(trendFile, "utf-8");
      trend = JSON.parse(content);
    } catch {
      // Create new trend
      trend = {
        metric_name: metricName,
        data: [],
        trend_direction: "stable"
      };
    }

    // Add data point
    trend.data.push({
      run_id: runId,
      timestamp: new Date().toISOString(),
      value,
      metadata
    });

    // Sort by timestamp
    trend.data.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate rolling means
    trend.rolling_mean_7d = this.calculateRollingMean(trend.data, 7);
    trend.rolling_mean_30d = this.calculateRollingMean(trend.data, 30);

    // Detect trend direction
    const direction = this.detectTrendDirection(trend.data);
    trend.trend_direction = direction.direction;
    trend.rate_of_change = direction.rate;

    // Check for anomalies
    await this.checkForAnomalies(metricName, trend);

    // Save trend
    await fs.mkdir(path.dirname(trendFile), { recursive: true });
    await fs.writeFile(trendFile, JSON.stringify(trend, null, 2));
  }

  /**
   * Get trend data
   */
  async getTrend(metricName: string): Promise<Trend | null> {
    const trendFile = path.join(this.trendsDir, `${metricName}.json`);

    try {
      const content = await fs.readFile(trendFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get all trends
   */
  async getAllTrends(): Promise<Trend[]> {
    const files = await fs.readdir(this.trendsDir);
    const jsonFiles = files.filter(f => f.endsWith(".json") && f !== "alerts.json");

    const trends: Trend[] = [];

    for (const file of jsonFiles) {
      const content = await fs.readFile(
        path.join(this.trendsDir, file),
        "utf-8"
      );
      const trend = JSON.parse(content) as Trend;
      trends.push(trend);
    }

    return trends;
  }

  /**
   * Calculate rolling mean
   */
  private calculateRollingMean(
    data: TrendDataPoint[],
    windowDays: number
  ): number {
    if (data.length === 0) return 0;

    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const windowStart = now - windowMs;

    const recentData = data.filter(
      d => new Date(d.timestamp).getTime() >= windowStart
    );

    if (recentData.length === 0) return 0;

    const sum = recentData.reduce((acc, d) => acc + d.value, 0);
    return sum / recentData.length;
  }

  /**
   * Detect trend direction
   */
  private detectTrendDirection(
    data: TrendDataPoint[]
  ): { direction: "increasing" | "decreasing" | "stable"; rate: number } {
    if (data.length < 2) {
      return { direction: "stable", rate: 0 };
    }

    // Use linear regression
    const n = data.length;
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    const values = data.map(d => d.value);

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += timestamps[i];
      sumY += values[i];
      sumXY += timestamps[i] * values[i];
      sumX2 += timestamps[i] * timestamps[i];
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return { direction: "stable", rate: 0 };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const rate = slope * 86400 * 1000; // Convert ms/day to day/day

    if (Math.abs(rate) < 0.001) {
      return { direction: "stable", rate };
    } else if (rate > 0) {
      return { direction: "increasing", rate };
    } else {
      return { direction: "decreasing", rate };
    }
  }

  /**
   * Check for anomalies
   */
  private async checkForAnomalies(metricName: string, trend: Trend): Promise<void> {
    if (trend.data.length < 10) return;

    const latest = trend.data[trend.data.length - 1];
    const mean = trend.rolling_mean_7d || 0;
    const stdDev = this.calculateStdDev(trend.data.slice(-7));
    const threshold = 2.5; // 2.5 standard deviations

    const deviation = (latest.value - mean) / stdDev;

    // Only alert on significant anomalies
    if (Math.abs(deviation) >= threshold) {
      const alert: AnomalyAlert = {
        timestamp: new Date().toISOString(),
        metric_name: metricName,
        run_id: latest.run_id,
        expected_value: mean,
        actual_value: latest.value,
        deviation,
        severity: Math.abs(deviation) >= 3.0 ? "high" : "medium"
      };

      await this.saveAlert(alert);
      console.warn(`⚠️  Anomaly detected for ${metricName}:`, alert);
    }
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(data: TrendDataPoint[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const variance =
      data.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) /
      data.length;

    return Math.sqrt(variance);
  }

  /**
   * Save alert to file
   */
  private async saveAlert(alert: AnomalyAlert): Promise<void> {
    const alerts: AnomalyAlert[] = await this.loadAlerts();
    alerts.push(alert);
    await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
  }

  /**
   * Load alerts
   */
  async loadAlerts(): Promise<AnomalyAlert[]> {
    try {
      const content = await fs.readFile(this.alertsFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  /**
   * Detect regression between two periods
   */
  async detectRegression(
    metricName: string,
    baselineDays: number = 30,
    testDays: number = 7
  ): Promise<RegressionDetection> {
    const trend = await this.getTrend(metricName);

    if (!trend || trend.data.length < baselineDays + testDays) {
      return {
        metric: metricName,
        detected: false,
        significance: 1.0,
        change_magnitude: 0,
        baseline_period: ["", ""],
        test_period: ["", ""]
      };
    }

    const now = Date.now();
    const baselineStart = now - baselineDays * 24 * 60 * 60 * 1000;
    const testStart = now - testDays * 24 * 60 * 60 * 1000;

    const baselineData = trend.data.filter(
      d => new Date(d.timestamp).getTime() >= baselineStart &&
           new Date(d.timestamp).getTime() < testStart
    );

    const testData = trend.data.filter(
      d => new Date(d.timestamp).getTime() >= testStart
    );

    const baselineMean = baselineData.reduce((sum, d) => sum + d.value, 0) / baselineData.length;
    const testMean = testData.reduce((sum, d) => sum + d.value, 0) / testData.length;

    const baselineStd = Math.sqrt(
      baselineData.reduce((sum, d) => sum + Math.pow(d.value - baselineMean, 2), 0) / baselineData.length
    );

    // Calculate significance (simple t-test)
    const pooledStd = Math.sqrt(
      (Math.pow(baselineStd, 2) / baselineData.length +
       Math.pow(baselineStd, 2) / testData.length)
    );

    const tStat = (testMean - baselineMean) / (pooledStd || 1);
    const pValue = Math.max(0.001, 1 - Math.abs(tStat) / 10); // Simplified

    const changeMagnitude = ((testMean - baselineMean) / baselineMean) * 100;

    return {
      metric: metricName,
      detected: pValue < 0.05 && Math.abs(changeMagnitude) > 10,
      significance: pValue,
      change_magnitude: changeMagnitude,
      baseline_period: [
        new Date(baselineStart).toISOString(),
        new Date(testStart).toISOString()
      ],
      test_period: [
        new Date(testStart).toISOString(),
        new Date(now).toISOString()
      ]
    };
  }

  /**
   * Analyze multiple metrics for regression
   */
  async analyzeAllRegressions(): Promise<RegressionDetection[]> {
    const trends = await this.getAllTrends();
    const detections: RegressionDetection[] = [];

    for (const trend of trends) {
      const detection = await this.detectRegression(trend.metric_name);
      if (detection.detected) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Process test run and extract metrics
   */
  async processTestRun(run: TestRun): Promise<void> {
    if (!run.metrics) return;

    const metrics = run.metrics;

    // Add metric data points
    await this.addDataPoint("success_rate", run.id, metrics.success_rate);
    await this.addDataPoint("avg_duration", run.id, metrics.avg_duration_ms);
    await this.addDataPoint("total_tool_calls", run.id, metrics.total_tool_calls);
    await this.addDataPoint("avg_turns", run.id, metrics.avg_iterations);
    await this.addDataPoint("total_errors", run.id, metrics.total_errors);
    await this.addDataPoint("circuit_breaker_trips", run.id, metrics.circuit_breaker_trips);

    // Tool-level metrics
    for (const [toolName, toolMetrics] of Object.entries(metrics.tool_usage)) {
      const toolSuccessRate = toolMetrics.success_count / toolMetrics.call_count;
      const toolAvgDuration = toolMetrics.avg_duration_ms;

      await this.addDataPoint(
        `tool_${toolName}_success_rate`,
        run.id,
        toolSuccessRate
      );

      await this.addDataPoint(
        `tool_${toolName}_avg_duration`,
        run.id,
        toolAvgDuration
      );
    }
  }

  /**
   * Get trend visualization data
   */
  async getTrendVisualizationData(metricName: string): Promise<{
    dates: string[];
    values: number[];
    rollingMean7d: number[];
    rollingMean30d: number[];
  }> {
    const trend = await this.getTrend(metricName);

    if (!trend) {
      return { dates: [], values: [], rollingMean7d: [], rollingMean30d: [] };
    }

    const dates = trend.data.map(d => d.timestamp.split("T")[0]);
    const values = trend.data.map(d => d.value);

    // Calculate rolling means for each point
    const rollingMean7d: number[] = [];
    const rollingMean30d: number[] = [];

    for (let i = 0; i < trend.data.length; i++) {
      const window7 = trend.data.slice(Math.max(0, i - 7 + 1), i + 1);
      const window30 = trend.data.slice(Math.max(0, i - 30 + 1), i + 1);

      rollingMean7d.push(window7.reduce((sum, d) => sum + d.value, 0) / window7.length);
      rollingMean30d.push(window30.reduce((sum, d) => sum + d.value, 0) / window30.length);
    }

    return {
      dates,
      values,
      rollingMean7d,
      rollingMean30d
    };
  }
}
