import React from 'react';
import styled from 'styled-components';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const ArtifactCard = styled.div<{ scale: number; opacity: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(${props => props.scale});
  opacity: ${props => props.opacity};
  width: 700px;
  background: rgba(26, 31, 46, 0.98);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.5);
`;

const ArtifactHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const ArtifactIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
`;

const ArtifactType = styled.div`
  flex: 1;
`;

const TypeName = styled.span`
  font-size: 12px;
  color: #00ff88;
  font-weight: 700;
  letter-spacing: 1px;
`;

const FileLabel = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
`;

const ArtifactContent = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
`;

const CodeBlock = styled.pre`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 14px;
  color: #00d4ff;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
`;

const ArtifactFooter = styled.div`
  display: flex;
  gap: 12px;
`;

const Tag = styled.span`
  padding: 8px 16px;
  background: rgba(0, 255, 136, 0.15);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #00ff88;
`;

const ActionButton = styled.button`
  flex: 1;
  padding: 14px;
  background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
  border: none;
  border-radius: 8px;
  color: #1a1f2e;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
`;

interface ArtifactPreviewProps {
  frame: number;
  sceneStart: number;
  sceneEnd: number;
}

const ARTIFACTS = [
  {
    icon: '📄',
    type: 'MARKDOWN',
    file: 'soil_health_report.md',
    code: '# Soil Health Analysis Report\n\n## Overview\n- Total area: 500 acres\n- Samples collected: 1,247\n- Analysis duration: 2.4 seconds\n\n## Key Findings\n\n### 1. Soil Compaction (CRITICAL)\n- **Severity**: High\n- **Affected area**: 347 acres (69.4%)\n- **Recommendation**: Deep tillage before planting\n\n### 2. Nitrogen Levels (MODERATE)\n- **Status**: Borderline optimal\n- **Current**: 42 ppm\n- **Target**: 45-55 ppm\n- **Action**: Apply 120 lbs nitrogen/acre\n\n### 3. Organic Matter (GOOD)\n- **Level**: 3.8% (Above average)\n- **Trend**: +0.2% vs 2024\n- **Recommendation**: Maintain current practices',
    tags: ['Analysis', 'Report', 'Agriculture'],
  },
  {
    icon: '📊',
    type: 'JSON DATA',
    file: 'yield_predictions_2026.json',
    code: '{\n  "predictions": [\n    {\n      "crop": "Corn",\n      "field_id": "A-42",\n      "expected_yield": "245.3 bu/ac",\n      "confidence": 0.94,\n      "optimal_harvest": "2026-09-15",\n      "risk_factors": ["drought", "pest_pressure"]\n    },\n    {\n      "crop": "Wheat",\n      "field_id": "B-18",\n      "expected_yield": "78.1 bu/ac",\n      "confidence": 0.87,\n      "optimal_harvest": "2026-07-22",\n      "risk_factors": ["temperature"]\n    }\n  ],\n  "total_acres": 500,\n  "projected_revenue": "$127,400",\n  "analysis_date": "2026-01-21"',
    tags: ['Data', 'Predictions', 'JSON'],
  },
  {
    icon: '🔧',
    type: 'CONFIGURATION',
    file: 'automation_pipeline.yaml',
    code: '# Automated Soil Analysis Pipeline\n\nversion: "2.0"\n\njobs:\n  - name: collect_sensors\n    schedule: "*/15 * * * *"\n    steps:\n      - download:\n          url: "https://api.sensors.io/v1/readings"\n          timeout: 30\n      - validate:\n          schema: "./schemas/sensor_reading.json"\n\n  - name: analyze_soil\n    depends_on: ["collect_sensors"]\n    model: "soil-health-v4"\n    params:\n      threshold: 0.85\n      include_forecast: true',
    tags: ['Automation', 'YAML', 'Pipeline'],
  },
];

export const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({
  frame,
  sceneStart,
  sceneEnd,
}) => {
  const sceneProgress = (frame - sceneStart) / (sceneEnd - sceneStart);
  const artifactIndex = Math.min(
    Math.floor(sceneProgress * ARTIFACTS.length),
    ARTIFACTS.length - 1
  );

  const scale = interpolate(
    frame,
    [sceneStart, sceneStart + 40, sceneEnd - 40, sceneEnd],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  const opacity = interpolate(
    frame,
    [sceneStart, sceneStart + 30, sceneEnd - 30, sceneEnd],
    [0, 1, 1, 0],
    { extrapolateRight: false }
  );

  const artifact = ARTIFACTS[artifactIndex];

  if (opacity <= 0) return null;

  return (
    <ArtifactCard scale={scale} opacity={opacity}>
      <ArtifactHeader>
        <ArtifactIcon>{artifact.icon}</ArtifactIcon>
        <ArtifactType>
          <TypeName>{artifact.type}</TypeName>
          <FileLabel>{artifact.file}</FileLabel>
        </ArtifactType>
      </ArtifactHeader>

      <ArtifactContent>
        <CodeBlock>{artifact.code}</CodeBlock>
      </ArtifactContent>

      <ArtifactFooter>
        {artifact.tags.map((tag, idx) => (
          <Tag key={idx}>{tag}</Tag>
        ))}
      </ArtifactFooter>
    </ArtifactCard>
  );
};
