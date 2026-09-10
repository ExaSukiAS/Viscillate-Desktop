import { useState, useEffect, useRef } from "react";
import { LineGraph } from "./components/lineGraph/lineGraph";
import "./style.css";
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

interface SensorData {
  v: number;
  timestamp: number; 
}

interface SerialPayload {
  frames: SensorData[];
}

interface GraphPoint {
  timestamp: number;
  voltage: number;
}

export const App = () => {
  const TIME_WINDOW_MS = 5000; 
  const MAX_POINTS = TIME_WINDOW_MS * 10;

  const styles = getComputedStyle(document.documentElement);
  const colors: Record<string, string> = {};
  const colorKeys = ['primary','primary-light','primary-dark','secondary','tertiary','error','success','background','background-light','background-lighter','text'];
  
  colorKeys.forEach((key) => {
    const value = styles.getPropertyValue(`--color-${key}`).trim();
    if (value) colors[key] = value;
  });

  const [graphData, setGraphData] = useState<GraphPoint[]>([]);

  const isSerialStarted = useRef(false);

  useEffect(() => {
    if (isSerialStarted.current) return;
    isSerialStarted.current = true;

    invoke('start_serial', { portName: "COM6" })
      .then(() => console.log("React: Successfully asked Rust to open COM6"))
      .catch((error) => console.error("React: Failed to open COM6:", error));
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let isMounted = true; 

    listen<SerialPayload>('serial-data', (event) => {
      if (!isMounted) return;
      
      
      if (event.payload.frames.length > 0) {
        setGraphData(prevData => {
          const newBatch = event.payload.frames.map(frame => ({
            timestamp: frame.timestamp,
            voltage: frame.v
          }));

          const combinedData = [...prevData, ...newBatch];
          
          if (combinedData.length > MAX_POINTS) {
            return combinedData.slice(combinedData.length - MAX_POINTS);
          }
          return combinedData;
        });
      }
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
      if (!isMounted) unlisten();
    });

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <>
      <LineGraph 
        data={graphData} 
        minVolt={-5} 
        maxVolt={5} 
        colors={colors}
      />
    </>
  );
};