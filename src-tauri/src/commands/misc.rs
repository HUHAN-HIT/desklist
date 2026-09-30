use crate::db::Db;
use rusqlite::params;
use serde::Serialize;
use tauri::{AppHandle, State};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DayCount {
    pub day: String,
    pub count: i64,
}

#[tauri::command]
pub fn stats_daily(db: State<'_, Db>, days: i64) -> Result<Vec<DayCount>, String> {
    let days = days.clamp(1, 365);
    let cutoff = (chrono::Local::now() - chrono::Duration::days(days - 1))
        .format("%Y-%m-%d")
        .to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT substr(done_at, 1, 10) AS d, COUNT(*) AS c
             FROM tasks
             WHERE done = 1 AND done_at IS NOT NULL AND substr(done_at,1,10) >= ?1
             GROUP BY d ORDER BY d",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![cutoff], |r| {
            Ok(DayCount { day: r.get(0)?, count: r.get(1)? })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn export_data(db: State<'_, Db>, path: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let tasks = crate::commands::tasks::query_all(&conn).map_err(|e| e.to_string())?;
    let plans = crate::commands::plans::query_all(&conn).map_err(|e| e.to_string())?;
    let payload = serde_json::json!({
        "app": "desklist",
        "version": 1,
        "exportedAt": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        "tasks": tasks,
        "plans": plans,
    });
    let text = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| format!("写入失败: {e}"))
}

#[tauri::command]
pub fn import_data(app: AppHandle, db: State<'_, Db>, path: String) -> Result<(), String> {
    let text = std::fs::read_to_string(&path).map_err(|e| format!("读取失败: {e}"))?;
    let v: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("解析失败: {e}"))?;
    let tasks: Vec<crate::commands::tasks::Task> =
        serde_json::from_value(v["tasks"].clone()).map_err(|e| format!("任务数据无效: {e}"))?;
    let plans: Vec<crate::commands::plans::Plan> =
        serde_json::from_value(v["plans"].clone()).map_err(|e| format!("计划数据无效: {e}"))?;
    {
        let mut conn = db.0.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM tasks", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM plans", []).map_err(|e| e.to_string())?;
        for p in &plans {
            tx.execute(
                "INSERT INTO plans(id,name,color,target_date,next_step,manual_progress,notes,archived,position,created_at)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                params![
                    p.id, p.name, p.color, p.target_date, p.next_step, p.manual_progress,
                    p.notes, p.archived as i64, p.position, p.created_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        for t in &tasks {
            tx.execute(
                "INSERT INTO tasks(id,title,notes,priority,due,today,plan_id,done,done_at,position,created_at)
                 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
                params![
                    t.id, t.title, t.notes, t.priority, t.due, t.today, t.plan_id, t.done as i64,
                    t.done_at, t.position, t.created_at
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "plans");
    crate::commands::emit_changed(&app, "tasks");
    Ok(())
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let m = app.autolaunch();
    if enabled {
        m.enable().map_err(|e| e.to_string())
    } else {
        m.disable().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}
