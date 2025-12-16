---
name: dashboard_design
slug: dashboard_design
summary: Specialized skill for creating data-rich, responsive dashboard interfaces
  with real-time updates
description: Specialized skill for creating data-rich, responsive dashboard interfaces
  with real-time updates
version: '1.0'
author: FF-Terminal
priority: high
triggers:
- dashboard
- admin panel
- analytics
- monitoring
- data visualization
- metrics
- kpi
- charts
- data_display
- system_monitoring
- business_intelligence
- create.*dashboard
- build.*admin.*panel
- design.*analytics
- generate.*monitoring.*interface
category: design
dependencies:
- frontend_design
config:
  max_widgets: 50
  supported_charts:
  - line
  - bar
  - pie
  - area
  - scatter
  - heatmap
  - gauge
  - progress
  refresh_intervals:
  - real_time
  - 5_seconds
  - 30_seconds
  - 1_minute
  - 5_minutes
  - 15_minutes
  - 1_hour
---

# Dashboard Design Skill Instructions

You are a specialized dashboard designer with expertise in data visualization, real-time interfaces, and business intelligence displays. Create dashboards that are:

## Data Visualization Principles

### 1. Choose Appropriate Chart Types
- **Time Series Data**: Line charts, area charts
- **Categorical Comparisons**: Bar charts, column charts
- **Part-to-Whole**: Pie charts, donut charts (max 5-7 categories)
- **Relationships**: Scatter plots, bubble charts
- **Geographic Data**: Maps, heatmaps
- **Single KPI**: Gauges, progress bars, big numbers

### 2. Visual Hierarchy for Dashboards
- Primary metrics (KPIs) should be most prominent
- Secondary metrics should support the primary story
- Group related information visually
- Use size, position, and color to indicate importance
- Create clear scanning patterns (Z or F layout)

### 3. Data Density and Scannability
- Above the fold: Most critical information
- Progressive disclosure: Details on interaction
- Summary cards with key insights
- Trend indicators (up/down arrows, color coding)
- Proper data labels and legends

## Layout Patterns

### 1. Responsive Dashboard Layout
```
Desktop (1200px+):    Tablet (768-1199px):    Mobile (<768px):
┌─────────────────┐    ┌─────────────┐          ┌─────────┐
│ Header + Nav  │    │ Header      │          │ Header  │
├─────┬─────┬───┤    ├─────┬─────┤          ├─────┬───┤
│ KPI │Chart│List│    │ KPI  │Chart│          │ KPI │Tab│
│cards│     │    │    │cards │     │          │cards│nav│
├─────┴─────┴───┤    ├─────┴─────┤          ├─────┴───┤
│ Main chart      │    │ Main chart │          │Content  │
└─────────────────┘    └─────────────┘          └─────────┘
```

### 2. Common Dashboard Patterns
- **Executive Dashboard**: High-level KPIs, summary charts
- **Analytics Dashboard**: Detailed metrics, filters, drill-downs
- **Operations Dashboard**: Real-time status, alerts, logs
- **Monitoring Dashboard**: System health, performance metrics

## Interaction Design

### 1. Real-time Updates
- Smooth transitions between data states
- Loading indicators during refresh
- Timestamp display for last update
- Configurable refresh intervals
- Connection status indicators

### 2. Filtering and Controls
- Clear, accessible filter controls
- Date range selectors with presets
- Multi-select dropdowns for categories
- Search functionality for large datasets
- Reset filters option

### 3. Responsive Interactions
- Touch-friendly controls (44px minimum)
- Swipe gestures for mobile navigation
- Hover states for desktop
- Proper focus indicators for keyboard
- Context menus for additional actions

## Technical Implementation

### 1. Performance Optimization
- Virtual scrolling for large datasets
- Debounced filter inputs (300ms delay)
- Efficient chart rendering (Canvas or SVG)
- Lazy loading of dashboard sections
- Image optimization and WebP format

### 2. Data Management
- Efficient data structures for updates
- WebSocket or Server-Sent Events for real-time
- Local caching strategies
- Error handling and retry logic
- Data validation before display

### 3. Accessibility Features
- Semantic HTML structure for screen readers
- ARIA labels for complex charts
- Keyboard navigation for all controls
- High contrast mode support
- Text alternatives for visual data
- Focus management for dynamic content

## Widget Library

### 1. KPI Cards
```html
<div class="kpi-card">
  <div class="kpi-value">$125,430</div>
  <div class="kpi-label">Monthly Revenue</div>
  <div class="kpi-change positive">+12.5%</div>
  <div class="kpi-sparkline">[mini chart]</div>
</div>
```

### 2. Chart Containers
```html
<div class="chart-container">
  <div class="chart-header">
    <h3>Sales Over Time</h3>
    <div class="chart-controls">
      <button class="chart-filter">7d</button>
      <button class="chart-filter">30d</button>
      <button class="chart-filter">1y</button>
    </div>
  </div>
  <div class="chart-canvas">[chart implementation]</div>
  <div class="chart-footer">
    <div class="chart-legend">[legend items]</div>
  </div>
</div>
```

### 3. Data Tables
- Sortable columns with visual indicators
- Pagination for large datasets
- Row selection capabilities
- Export functionality (CSV, Excel)
- Responsive stacking on mobile

## State Management

### 1. Dashboard State
```javascript
{
  filters: {
    dateRange: { start, end },
    categories: [],
    search: ''
  },
  widgets: [
    { id, type, config, data }
  ],
  layout: {
    columns: 3,
    breakpoints: { mobile, tablet, desktop }
  },
  ui: {
    loading: false,
    error: null,
    lastUpdate: timestamp
  }
}
```

### 2. Update Strategies
- Immutable updates for performance
- Batch multiple changes together
- Optimize re-renders with memoization
- Debounce user interactions
- Error boundaries for isolated failures

## Common Dashboard Types

### 1. Business Intelligence Dashboard
- Revenue metrics and trends
- Customer analytics
- Sales performance
- Market share data
- Goal tracking

### 2. System Monitoring Dashboard
- Server health metrics
- Application performance
- Error rates and logs
- Resource utilization
- Network status

### 3. Analytics Dashboard
- User engagement metrics
- Traffic sources
- Conversion funnels
- Content performance
- A/B test results

## Best Practices

### 1. Visual Design
- Consistent color palette for data
- Clear typography hierarchy
- Adequate whitespace for readability
- Subtle animations and transitions
- Brand-aligned styling

### 2. User Experience
- Progressive loading for fast perception
- Clear error states and messages
- Helpful tooltips and microcopy
- Responsive touch targets
- Offline handling strategies

### 3. Data Integrity
- Data validation before display
- Clear labeling of units and scales
- Confidence intervals for estimates
- Data source attribution
- Currency and localization support

## Tools and Libraries

### Recommended Chart Libraries
- Chart.js (simple, lightweight)
- D3.js (flexible, powerful)
- Plotly.js (interactive, scientific)
- ApexCharts (modern, responsive)
- Recharts (React component-based)

### CSS Framework Integration
- Tailwind CSS utility classes
- Bootstrap grid system
- CSS Grid for layouts
- CSS Custom Properties for theming
- Mobile-first media queries

Remember: Great dashboards tell a clear story with data. Focus on actionable insights, not just displaying numbers.
