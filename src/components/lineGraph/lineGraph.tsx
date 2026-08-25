import { useEffect, useRef } from "react";
import uPlot, { Options } from "uplot";
import "uplot/dist/uPlot.min.css";

type LineGraphProps = {
  maxPoints: number;
  maxVolt: number;
  minVolt: number;
  latestPoint?: { timestamp: number; voltage: number };
  colors: Record<string, string>;
};

export const LineGraph = ({
  maxPoints,
  maxVolt,
  minVolt,
  latestPoint,
  colors
}: LineGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  
  // Store series data in refs so updates don't trigger React re-renders: [xTimestamps[], yVoltages[]]
  const dataRef = useRef<[number[], number[]]>([[], []]);

  // Initialize uPlot chart instance
  useEffect(() => {
    if (!containerRef.current) return;

    const opts: Options = {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      scales: {
        x: { time: false },
        y: { auto: false, range: [minVolt, maxVolt] },
      },
      axes: [
        // X Axis
        {
          stroke: colors.text,
          space: 40, // Prevents label overlapping by giving more space between ticks
          
          // Format ticks as elapsed time
          values: (self, ticks) => {
            const startTime = self.data[0][0] ?? 0;
            
            return ticks.map((val) => {
              const elapsedUs = Math.round((val - startTime));
              return `${elapsedUs.toLocaleString()}`;
            });
          },
          grid: {
            show: true,
            stroke: colors['background-light'],
            width: 1,
          },
          ticks: {
            show: true,
            stroke: colors.text,
            width: 1,
          },
        },
        // Y Axis
        {
          stroke: colors.text,
          grid: {
            show: true,
            stroke: colors['background-light'],
            width: 1,
          },
          ticks: {
            show: true,
            stroke: colors.text,
            width: 1,
          },
        },
      ],
      series: [
        {
          label: "Elapsed Time",
          // Formats the tooltip / legend value on hover
          value: (self, rawVal) => {
            if (rawVal == null) return "Hover for value";
            const startTime = self.data[0][0] ?? 0;
            const elapsedUs = Math.round((rawVal - startTime));
            return `${elapsedUs.toLocaleString()} ms`;
          },
        },
        {
          label: "Voltage",
          stroke: colors.primary,
          width: 2,
          value: (self, rawVal) => (rawVal != null ? `${rawVal.toFixed(2)} V` : "Hover for value"),
        },
      ],
    };
    const chart = new uPlot(opts, dataRef.current, containerRef.current);
    plotRef.current = chart;

    // Handle container resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.destroy();
      plotRef.current = null;
    };
  }, [minVolt, maxVolt]);

  // Append incoming real-time points using chart.setData()
  useEffect(() => {
    if (!latestPoint || !plotRef.current) return;

    const [x, y] = dataRef.current;

    x.push(latestPoint.timestamp);
    y.push(latestPoint.voltage);

    // Evict old points if maxPoints capacity is reached
    if (x.length > maxPoints) {
      x.shift();
      y.shift();
    }

    // Direct high-performance update to uPlot canvas (bypasses DOM manipulation)
    plotRef.current.setData(dataRef.current);
  }, [latestPoint, maxPoints]);

  return <div ref={containerRef} id="graphContainer"/>;
};