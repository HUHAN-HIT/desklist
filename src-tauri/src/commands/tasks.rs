use crate::db::Db;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub priority: i64,
    pub due: Option<String>,
    /// 排入今天的日期（YYYY-MM-DD）；NULL = 未排。与截止日 due 相互独立：
    /// due = 硬期限，today = 今日意向（显式"排今天"动作，保留至完成或取消）。
    pub today: Option<String>,
    pub plan_id: Option<String>,
    pub done: bool,
    pub done_at: Option<String>,
    pub position: i64,
    pub created_at: String,
}

const TASK_COLS: &str = "id,title,notes,priority,due,today,plan_id,done,done_at,position,created_at";

fn row_to_task(r: &Row) -> Result<Task, rusqlite::Error> {
    Ok(Task {
        id: r.get(0)?,
        title: r.get(1)?,
        notes: r.get(2)?,
        priority: r.get(3)?,
        due: r.get(4)?,
        today: r.get(5)?,
        plan_id: r.get(6)?,
        done: r.get::<_, i64>(7)? != 0,
        done_at: r.get(8)?,
        position: r.get(9)?,
        created_at: r.get(10)?,
    })
}

pub(crate) fn query_all(conn: &Connection) -> Result<Vec<Task>, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {TASK_COLS} FROM tasks ORDER BY position, created_at"
    ))?;
    let v = stmt
        .query_map([], row_to_task)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(v)
}

fn fetch_task(conn: &Connection, id: &str) -> Result<Task, String> {
    conn.query_row(
        &format!("SELECT {TASK_COLS} FROM tasks WHERE id = ?1"),
        params![id],
        row_to_task,
    )
    .map_err(|e| e.to_string())
}

fn insert_task(conn: &Connection, t: &Task) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO tasks(id,title,notes,priority,due,today,plan_id,done,done_at,position,created_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        params![
            t.id, t.title, t.notes, t.priority, t.due, t.today, t.plan_id, t.done as i64,
            t.done_at, t.position, t.created_at
        ],
    )?;
    Ok(())
}

fn today_date() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[tauri::command]
pub fn list_tasks(db: State<'_, Db>) -> Result<Vec<Task>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    query_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_task(
    app: AppHandle,
    db: State<'_, Db>,
    title: String,
    priority: i64,
    due: Option<String>,
    plan_id: Option<String>,
    pinned: Option<bool>,
) -> Result<Task, String> {
    let title = title.trim().to_string();
    if title.is_empty() {
        return Err("标题不能为空".into());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::now_v7().to_string();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let pos: i64 = conn
        .query_row("SELECT COALESCE(MAX(position),0)+1 FROM tasks", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let task = Task {
        id: id.clone(),
        title,
        notes: String::new(),
        priority,
        due,
        today: if pinned.unwrap_or(false) { Some(today_date()) } else { None },
        plan_id,
        done: false,
        done_at: None,
        position: pos,
        created_at: now,
    };
    insert_task(&conn, &task).map_err(|e| e.to_string())?;
    drop(conn);
    crate::commands::emit_changed(&app, "tasks");
    Ok(task)
}

#[tauri::command]
pub fn update_task(app: AppHandle, db: State<'_, Db>, task: Task) -> Result<Task, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    // 注意 ?1..?8 序号与 params! 顺序一一对应：?1=id, ?2..?8=各字段
    conn.execute(
        "UPDATE tasks SET title=?2, notes=?3, priority=?4, due=?5, today=?6, plan_id=?7, position=?8 WHERE id=?1",
        params![task.id, task.title, task.notes, task.priority, task.due, task.today, task.plan_id, task.position],
    )
    .map_err(|e| e.to_string())?;
    drop(conn);
    crate::commands::emit_changed(&app, "tasks");
    Ok(task)
}

/// 显式"排入今天"/取消。排入时记录当天日期，跨天未完成的保留并可在前端显示"昨天排的"。
#[tauri::command]
pub fn pin_today(app: AppHandle, db: State<'_, Db>, task_id: String, pinned: bool) -> Result<Task, String> {
    let today = if pinned { Some(today_date()) } else { None };
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        // ?1=id, ?2=today
        conn.execute(
            "UPDATE tasks SET today=?2 WHERE id=?1",
            params![task_id, today],
        )
        .map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "tasks");
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    fetch_task(&conn, &task_id)
}

#[tauri::command]
pub fn toggle_task(app: AppHandle, db: State<'_, Db>, task_id: String, done: bool) -> Result<Task, String> {
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let done_at = if done { Some(now) } else { None };
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE tasks SET done=?2, done_at=?3 WHERE id=?1",
            params![task_id, done as i64, done_at],
        )
        .map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "tasks");
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    fetch_task(&conn, &task_id)
}

#[tauri::command]
pub fn delete_task(app: AppHandle, db: State<'_, Db>, task_id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id=?1", params![task_id])
        .map_err(|e| e.to_string())?;
    drop(conn);
    crate::commands::emit_changed(&app, "tasks");
    Ok(())
}
