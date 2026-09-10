#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::time::{Duration, Instant};
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct SensorData {
    v: f32,      
    timestamp: u64,
}

#[derive(Clone, serde::Serialize)]
struct SerialPayload {
    frames: Vec<SensorData>,
}

#[tauri::command]
fn start_serial(app: AppHandle, port_name: String) -> Result<(), String> {
    let baud_rate = 115_200;

    let port_result = serialport::new(&port_name, baud_rate)
        .timeout(Duration::from_millis(10))
        .open();

    match port_result {
        Ok(mut serial) => {
            let _ = serial.write_data_terminal_ready(true);
            let _ = serial.write_request_to_send(true);

            thread::spawn(move || {
                let mut serial_buf = vec![0u8; 32768]; 
                let mut byte_queue: Vec<u8> = Vec::with_capacity(65536);
                let mut frame_batch: Vec<SensorData> = Vec::with_capacity(2048);
                let mut last_emit = Instant::now();

                loop {
                    match serial.read(serial_buf.as_mut_slice()) {
                        Ok(bytes_read) => {
                            if bytes_read > 0 {
                                byte_queue.extend_from_slice(&serial_buf[..bytes_read]);

                                let mut i = 0;
                                let queue_len = byte_queue.len();

                                // Scan for 14 bytes now
                                while i + 14 <= queue_len {
                                    if byte_queue[i] == 0xAA && byte_queue[i + 1] == 0xBB {
                                        // Parse 32-bit float Little Endian
                                        let v = f32::from_le_bytes([
                                            byte_queue[i + 2], byte_queue[i + 3],
                                            byte_queue[i + 4], byte_queue[i + 5],
                                        ]);

                                        let timestamp = u64::from_le_bytes([
                                            byte_queue[i + 6], byte_queue[i + 7],
                                            byte_queue[i + 8], byte_queue[i + 9],
                                            byte_queue[i + 10], byte_queue[i + 11],
                                            byte_queue[i + 12], byte_queue[i + 13],
                                        ]);

                                        frame_batch.push(SensorData { v, timestamp });
                                        i += 14;
                                    } else {
                                        if let Some(pos) = byte_queue[i + 1..].iter().position(|&b| b == 0xAA) {
                                            i += 1 + pos;
                                        } else {
                                            i = queue_len;
                                            break;
                                        }
                                    }
                                }
                                if i > 0 {
                                    byte_queue.drain(0..i);
                                }
                            }
                        }
                        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {}
                        Err(e) => { eprintln!("Serial error: {:?}", e); break; }
                    }

                    // Emit to React roughly ~60 times a second
                    if !frame_batch.is_empty() && (frame_batch.len() >= 1500 || last_emit.elapsed() >= Duration::from_millis(16)) {
                        let payload = SerialPayload {
                            frames: std::mem::replace(&mut frame_batch, Vec::with_capacity(2048)),
                        };
                        let _ = app.emit("serial-data", payload);
                        last_emit = Instant::now();
                    }
                }
            });
            Ok(())
        }
        Err(e) => Err(format!("Failed to open port {}: {}", port_name, e)),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_serial])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}