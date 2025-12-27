import React from "react";

interface ChartProps {
  title: string;
  data: number[];
  labels: string[];
  color?: string;
}

export function BarChart({ title, data, labels, color = "#4F46E5" }: ChartProps) {
  const maxVal = Math.max(...data);
  const barWidth = 100 / data.length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
      
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-600">
          <span>{maxVal}</span>
          <span>{Math.round(maxVal / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-64 flex items-end gap-2">
          {data.map((val, idx) => (
            <div
              key={idx}
              className="flex-1 relative group"
              style={{ height: '100%' }}
            >
              {/* Bar */}
              <div
                className="w-full rounded-t hover:opacity-80 transition-opacity"
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: color
                }}
              />
              
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
                <div className="font-bold">{val}</div>
                <div className="text-slate-400">{labels[idx]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="ml-14 mt-2 flex">
        {labels.map((label, idx) => (
          <div
            key={idx}
            className="flex-1 text-xs text-slate-600 text-center truncate"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

interface LineChartProps {
  title: string;
  data: number[];
  labels: string[];
  color?: string;
}

export function LineChart({ title, data, labels, color = "#4F46E5" }: LineChartProps) {
  const maxVal = Math.max(...data);
  const points = data.map((val, idx) => ({
    x: (idx / (data.length - 1)) * 100,
    y: 100 - (val / maxVal) * 100
  }));

  const pathData = points
    .map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
      
      <div className="relative h-64">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <div
            key={pct}
            className="absolute left-0 right-0 border-t border-slate-200"
            style={{ top: `${pct * 100}%` }}
          />
        ))}

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-slate-600">
          <span>{maxVal.toFixed(1)}</span>
          <span>{(maxVal / 2).toFixed(1)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full relative">
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {labels.map((label, idx) => (
              <div
                key={idx}
                className="text-xs text-slate-600 text-center truncate"
                style={{ left: `${(idx / (labels.length - 1)) * 100}%`, position: 'absolute', transform: 'translateX(-50%)' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Line */}
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            
            {/* Data points */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="2"
                fill={color}
                className="hover:r-4 transition-all cursor-pointer"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

interface DonutChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
}

export function DonutChart({ title, data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
      
      <div className="flex items-center gap-8">
        {/* Donut chart */}
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {data.map((item, idx) => {
              const sliceAngle = (item.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + sliceAngle;
              const largeArc = sliceAngle > 180 ? 1 : 0;

              const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 50 + 40 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 50 + 40 * Math.sin((endAngle - 90) * Math.PI / 180);

              currentAngle = endAngle;

              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={item.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
            
            {/* Inner circle */}
            <circle cx="50" cy="50" r="25" fill="white" />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{total}</p>
              <p className="text-xs text-slate-600">Total</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-xs text-slate-600">
                  {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  icon: string;
}

export function StatCard({ title, value, unit, change, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-4xl font-bold text-slate-800">
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit && <span className="text-xl text-slate-600 ml-1">{unit}</span>}
        </p>
        {change !== undefined && (
          <div className={`flex items-center text-sm mt-2 ${
            change >= 0 ? "text-green-600" : "text-red-600"
          }`}>
            <span>{change >= 0 ? "↑" : "↓"}</span>
            <span className="font-medium">{Math.abs(change)}%</span>
            <span className="text-slate-600 ml-1">from last week</span>
          </div>
        )}
      </div>
    </div>
  );
}
