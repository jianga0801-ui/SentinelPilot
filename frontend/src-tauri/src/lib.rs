use std::{
  net::{TcpListener, TcpStream},
  sync::Mutex,
  thread,
  time::{Duration, Instant},
};

use tauri::{AppHandle, Manager, RunEvent, State, WindowEvent};
use tauri_plugin_shell::{
  process::{CommandChild, CommandEvent},
  ShellExt,
};

struct BackendState {
  base_url: String,
  pid: u32,
  child: Mutex<Option<CommandChild>>,
}

#[tauri::command]
fn backend_base_url(state: State<'_, BackendState>) -> String {
  state.base_url.clone()
}

fn available_port() -> Result<u16, String> {
  let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
  let port = listener.local_addr().map_err(|error| error.to_string())?.port();
  Ok(port)
}

fn wait_for_backend(port: u16) -> Result<(), String> {
  let deadline = Instant::now() + Duration::from_secs(12);
  while Instant::now() < deadline {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return Ok(());
    }
    thread::sleep(Duration::from_millis(120));
  }
  Err(format!("backend did not open port {port} within startup timeout"))
}

fn start_backend(app: &tauri::App) -> Result<BackendState, Box<dyn std::error::Error>> {
  let port = available_port().map_err(std::io::Error::other)?;
  let port_arg = port.to_string();
  let sidecar = app
    .shell()
    .sidecar("sentinel-pilot-backend")?
    .args(["--host", "127.0.0.1", "--port", port_arg.as_str()]);
  let (mut rx, child) = sidecar.spawn()?;
  let pid = child.pid();

  tauri::async_runtime::spawn(async move {
    while let Some(event) = rx.recv().await {
      match event {
        CommandEvent::Stdout(bytes) => {
          log::info!("backend: {}", String::from_utf8_lossy(&bytes).trim());
        }
        CommandEvent::Stderr(bytes) => {
          log::warn!("backend: {}", String::from_utf8_lossy(&bytes).trim());
        }
        _ => {}
      }
    }
  });

  wait_for_backend(port).map_err(std::io::Error::other)?;
  Ok(BackendState {
    base_url: format!("http://127.0.0.1:{port}"),
    pid,
    child: Mutex::new(Some(child)),
  })
}

#[cfg(windows)]
fn kill_process_tree(pid: u32) {
  use std::os::windows::process::CommandExt;

  const CREATE_NO_WINDOW: u32 = 0x0800_0000;
  let _ = std::process::Command::new("taskkill")
    .args(["/PID", &pid.to_string(), "/T", "/F"])
    .creation_flags(CREATE_NO_WINDOW)
    .status();
}

#[cfg(not(windows))]
fn kill_process_tree(_pid: u32) {}

fn stop_backend(app: &AppHandle) {
  if let Some(state) = app.try_state::<BackendState>() {
    kill_process_tree(state.pid);
    if let Ok(mut child) = state.child.lock() {
      if let Some(process) = child.take() {
        let _ = process.kill();
      }
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![backend_base_url])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      app.manage(start_backend(app)?);
      Ok(())
    })
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { .. } = event {
        stop_backend(&window.app_handle());
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
        stop_backend(app);
      }
    });
}
