use crate::db::Db;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_config(db: State<'_, Db>, key: String) -> Result<Option<String>, String> {
    Ok(crate::db::get_config(&db, &key))
}

#[tauri::command]
pub fn set_config(app: AppHandle, db: State<'_, Db>, key: String, value: String) -> Result<(), String> {
    crate::db::set_config_silent(&db, &key, &value);
    crate::commands::emit_changed(&app, "config");
    Ok(())
}
