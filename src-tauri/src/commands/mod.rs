pub mod config;
pub mod misc;
pub mod plans;
pub mod tasks;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
pub struct ChangedPayload<'a> {
    pub entity: &'a str,
}

/// 所有数据变更后广播，双窗监听后失效重取（TanStack Query）。
pub fn emit_changed(app: &AppHandle, entity: &str) {
    let _ = app.emit("db://changed", ChangedPayload { entity });
}
