import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface ToolNode {
  id: string;
  name: string;
  type: "file" | "web" | "system" | "analysis" | "other";
  usage: number;
  successRate: number;
  avgDuration: number;
}

interface ToolEdge {
  source: string;
  target: string;
  weight: number;
}

interface KnowledgeGraphProps {
  tools: ToolNode[];
  edges: ToolEdge[];
}

export default function KnowledgeGraph({ tools, edges }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || tools.length === 0) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    // Setup dimensions
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Create simulation
    const simulation = d3
      .forceSimulation<ToolNode, ToolEdge>(tools)
      .force("link", d3.forceLink<ToolNode, ToolEdge>(edges).id((d) => `${d.source.id}-${d.target.id}`))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Add edges
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke-width", (d) => Math.sqrt(d.weight) * 2)
      .attr("stroke", "#cbd5e1");

    // Add nodes
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, ToolNode>("g")
      .data(tools)
      .join("g")
      .call(d3.drag<SVGGElement, ToolNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", (d) => 10 + Math.sqrt(d.usage) * 3)
      .attr("fill", (d) => getToolColor(d.successRate))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Node labels
    node.append("text")
      .attr("dy", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#374151")
      .text((d) => d.name);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => {
        svg.select(".links").attr("transform", event.transform);
        svg.select(".nodes").attr("transform", event.transform);
      });

    svg.call(zoom.transform, d3.zoomIdentity);

    // Add legend
    const legendData = [
      { color: "#10b981", label: "≥ 90% success" },
      { color: "#f59e0b", label: "70-89%" },
      { color: "#ef4444", label: "< 70%" }
    ];

    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(20, 20)");

    legendData.forEach((d, i) => {
      legend.append("circle")
        .attr("cx", 0)
        .attr("cy", i * 20)
        .attr("r", 6)
        .attr("fill", d.color);
      legend.append("text")
        .attr("x", 12)
        .attr("y", i * 20 + 4)
        .style("font-size", "10px")
        .text(d.label);
    });

    // Run simulation
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x!)
        .attr("y1", (d) => d.source.y!)
        .attr("x2", (d) => d.target.x!)
        .attr("y2", (d) => d.target.y!);

      node
        .attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, ToolNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, ToolNode>) {
      if (!event.subject) return;
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, ToolNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Cleanup on unmount
    return () => {
      simulation.stop();
    };
  }, [tools, edges, svgRef]);

  const getToolColor = (successRate: number): string => {
    if (successRate >= 0.9) return "#10b981"; // Green
    if (successRate >= 0.7) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  return (
    <div className="knowledge-graph-container">
      <style>{`
        .knowledge-graph-container {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .links line {
          stroke-opacity: 0.6;
        }
        .nodes circle {
          cursor: pointer;
          transition: all 0.2s;
        }
        .nodes circle:hover {
          stroke-width: 3;
        }
        .legend text {
          fill: #374151;
          font-size: 12px;
        }
      `}</style>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "600px",
          backgroundColor: "#f9fafb"
        }}
      />
    </div>
  );
}
