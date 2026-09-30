use crate::db::Db;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Plan {
    pub id: String,
    pub name: String,
    pub color: String,
    pub target_date: Option<String>,
    pub next_step: Option<String>,
    pub manual_progress: Option<f64>,
    pub notes: String,
    pub archived: bool,
    pub position: i64,
    pub created_at: String,
    #[serde(default)]
    pub task_total: i64,
    #[serde(default)]
    pub task_done: i64,
}

const PLAN_COLS: &str =
    "p.id, p.name, p.color, p.target_date, p.next_step, p.manual_progress, p.notes, p.archived, p.position, p.created_at";

fn row_to_plan(r: &Row) -> Result<Plan, rusqlite::Error> {
    Ok(Plan {
        id: r.get(0)?,
        name: r.get(1)?,
        color: r.get(2)?,
        target_date: r.get(3)?,
        next_step: r.get(4)?,
        manual_progress: r.get(5)?,
        notes: r.get(6)?,
        archived: r.get::<_, i64>(7)? != 0,
        position: r.get(8)?,
        created_at: r.get(9)?,
        task_total: r.get(10)?,
        task_done: r.get(11)?,
    })
}

pub(crate) fn query_all(conn: &Connection) -> Result<Vec<Plan>, rusqlite::Error> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {PLAN_COLS}, COUNT(t.id) AS total, COALESCE(SUM(t.done), 0) AS done_count
         FROM plans p LEFT JOIN tasks t ON t.plan_id = p.id
         GROUP BY p.id ORDER BY p.position, p.created_at"
    ))?;
    let v = stmt.query_map([], row_to_plan)?.collect::<Result<Vec<_>, _>>()?;
    Ok(v)
}

#[tauri::command]
pub fn list_plans(db: State<'_, Db>) -> Result<Vec<Plan>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    query_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_plan(
    app: AppHandle,
    db: State<'_, Db>,
    name: String,
    color: String,
    target_date: Option<String>,
    next_step: Option<String>,
    manual: Option<f64>,
) -> Result<Plan, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("计划名不能为空".into());
    }
    let id = uuid::Uuid::now_v7().to_string();
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        // 新计划排到列表末尾，与手动拖拽排序保持一致
        let pos: i64 = conn
            .query_row("SELECT COALESCE(MAX(position),0)+1 FROM plans", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO plans(id,name,color,target_date,next_step,manual_progress,notes,archived,position,created_at)
             VALUES(?1,?2,?3,?4,?5,?6,'',0,?7,?8)",
            params![id, name, color, target_date, next_step, manual, pos, now],
        )
        .map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "plans");
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    query_all(&conn)
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| "创建后未找到计划".to_string())
}

#[tauri::command]
pub fn update_plan(app: AppHandle, db: State<'_, Db>, plan: Plan) -> Result<Plan, String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE plans SET name=?2, color=?3, target_date=?4, next_step=?5, manual_progress=?6, notes=?7, archived=?8, position=?9
             WHERE id=?1",
            params![
                plan.id, plan.name, plan.color, plan.target_date, plan.next_step,
                plan.manual_progress, plan.notes, plan.archived as i64, plan.position
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "plans");
    Ok(plan)
}

#[tauri::command]
pub fn delete_plan(app: AppHandle, db: State<'_, Db>, plan_id: String) -> Result<(), String> {
    {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM plans WHERE id=?1", params![plan_id])
            .map_err(|e| e.to_string())?;
        // 归属任务经外键 ON DELETE SET NULL 自动变为收件箱任务
    }
    crate::commands::emit_changed(&app, "plans");
    crate::commands::emit_changed(&app, "tasks");
    Ok(())
}

/// 手动拖拽排序：按传入的 ID 顺序写 position（1..n）。
#[tauri::command]
pub fn reorder_plans(app: AppHandle, db: State<'_, Db>, plan_ids: Vec<String>) -> Result<(), String> {
    {
        let mut conn = db.0.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (i, id) in plan_ids.iter().enumerate() {
            // 注意 ?1/?2 序号与 params! 顺序必须一一对应：?1=id, ?2=position
            tx.execute(
                "UPDATE plans SET position=?2 WHERE id=?1",
                params![id, (i + 1) as i64],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
    }
    crate::commands::emit_changed(&app, "plans");
    Ok(())
}
