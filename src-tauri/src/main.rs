#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::Write;
use std::net::{TcpListener, TcpStream};
use std::time::Duration;

const SINGLE_INSTANCE_PORT: u16 = 49822;

fn main() {
    match TcpListener::bind(("127.0.0.1", SINGLE_INSTANCE_PORT)) {
        Ok(listener) => {
            // First instance: launch Tauri app with listener
            app_lib::run(listener);
        }
        Err(_) => {
            // Existing instance running: wake it up
            if let Ok(mut stream) = TcpStream::connect_timeout(
                &std::net::SocketAddr::from(([127, 0, 0, 1], SINGLE_INSTANCE_PORT)),
                Duration::from_millis(1500),
            ) {
                let _ = stream.write_all(b"show\n");
                let _ = stream.flush();
            }
        }
    }
}
