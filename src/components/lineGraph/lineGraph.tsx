import { useEffect, useRef } from "react";
import uPlot, { Options } from "uplot";
import "uplot/dist/uPlot.min.css";

type LineGraphProps = {
  data: { timestamp: number; voltage: number }[];
  maxVolt: number;
  minVolt: number;
  colors: Record<string, string>;
};

export const LineGraph = ({
  data,
  maxVolt,
  minVolt,
  colors
}: LineGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If CSS collapses the div, fallback to 800x400 so uPlot still renders
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 400;

    const opts: Options = {
      width,
      height,
      scales: {
        x: { time: false },
        y: { range: [minVolt, maxVolt] }, // enforce the Y-axis range based on props
      },
      axes: [
        // X Axis
        {
          stroke: colors.text,
          space: 60,
          values: (self, ticks) => {
            return ticks.map((val) => `${(val / 1000).toFixed(0)} ms`);
          },
          grid: { show: true, stroke: colors['background-light'], width: 1 },
          ticks: { show: true, stroke: colors.text, width: 1 },
        },
        // Y Axis
        {
          stroke: colors.text,
          grid: { show: true, stroke: colors['background-light'], width: 1 },
          ticks: { show: true, stroke: colors.text, width: 1 },
        },
      ],
      series: [
        {
          label: "Time",
          value: (self, rawVal) => (rawVal == null ? "Hover for value" : `${(rawVal / 1000).toFixed(1)} ms`),
        },
        {
          label: "Voltage",
          // Fallback to a blue color just in case the CSS variable is empty
          stroke: colors.primary || "#3b82f6", 
          width: 2,
          value: (self, rawVal) => (rawVal != null ? `${rawVal.toFixed(2)} V` : "Hover for value"),
        },
      ],
    };

    const chart = new uPlot(opts, [[], []], containerRef.current);
    plotRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Only resize if dimensions are valid
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          chart.setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.destroy();
      plotRef.current = null;
    };
  }, [minVolt, maxVolt, colors]);

  useEffect(() => {
    if (!plotRef.current || !data || data.length === 0) return;

    const len = data.length;
    
    // Using standard arrays for foolproof compatibility
    const x = Array(len);
    const y = Array(len);

    for (let i = 0; i < len; i++) {
      // Force perfectly increasing X values to create the smooth oscilloscope layout
      x[i] = i * 100; 
      y[i] = data[i].voltage;
    }

    plotRef.current.setData([x, y]);
  }, [data]);

  return <div ref={containerRef} id="graphContainer" />;
};