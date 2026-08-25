import { useState, useEffect } from "react";
import { LineGraph } from "./components/lineGraph/lineGraph";
import "./App.css";

export const App = () => {
  const styles = getComputedStyle(document.documentElement);
  const colors: Record<string, string> = {};
  // List of color keys based on SCSS map
  const colorKeys = ['primary','primary-light','primary-dark','secondary','tertiary','error','success','background','background-light','background-lighter','text'];
  colorKeys.forEach((key) => {
    const varName = `--color-${key}`;
    const value = styles.getPropertyValue(varName).trim();
    if (value) {
      colors[key] = value;
    }
  });

  const [latestPoint, setLatestPoint] = useState<{ timestamp: number; voltage: number }>();

  // Simulate high-frequency real-time stream (e.g., WebSocket / BLE data stream)
  useEffect(() => {
    const interval = setInterval(() => {
      const newPoint = {
        timestamp: Date.now(),
        voltage: Math.sin(Date.now() / 500) * 45.0 + (Math.random() - 0.5) * 4,
      };

      setLatestPoint(newPoint);
    }, 17); // 58Hz Update

    return () => clearInterval(interval);
  }, []);

  return (
    <LineGraph 
      maxPoints={500} 
      minVolt={-50} 
      maxVolt={50} 
      latestPoint={latestPoint} 
      colors={colors}
    />
  );
};