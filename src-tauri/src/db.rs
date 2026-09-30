use rusqlite::{params, Connection};
use std::path::Path;

/// 全局数据库状态：Mutex<Connection>，所有命令经此访问 SQLite。
pub struct Db(pub std::sync::Mutex<Connection>);

pub fn get_config(db: &Db, key: &str) -> Option<String> {
    let conn = db.0.lock().ok()?;
    conn.query_row("SELECT value FROM config WHERE key=?1", params![key], |r| r.get(0))
        .ok()
}

pub fn set_config_silent(db: &Db, key: &str, value: &str) {
    if let Ok(conn) = db.0.lock() {
        let _ = conn.execute(
            "INSERT INTO config(key, value) VALUES(?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        );
    }
}

pub fn init(dir: &Path) -> Result<Connection, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(dir)?;
    let conn = Connection::open(dir.join("desklist.db"))?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    // 每日启动备份，保留最近 7 份
    if let Some(p) = dir.to_str() {
        let _ = make_backup(&conn, p);
    }
    let plans: i64 = conn.query_row("SELECT COUNT(*) FROM plans", [], |r| r.get(0))?;
    if plans == 0 {
        seed(&conn)?;
    }
    Ok(conn)
}

fn make_backup(conn: &Connection, dir: &str) -> Result<(), Box<dyn std::error::Error>> {
    use std::fs;
    let backup_dir = format!("{}/backups", dir);
    fs::create_dir_all(&backup_dir)?;
    let today = chrono::Local::now().format("%Y%m%d");
    let dest = format!("{}/desklist-{}.db", backup_dir, today);
    if !Path::new(&dest).exists() {
        let mut dst = Connection::open(&dest)?;
        let backup = rusqlite::backup::Backup::new(conn, &mut dst)?;
        backup.run_to_completion(64, std::time::Duration::from_millis(5), None)?;
    }
    // 清理旧备份，仅保留最近 7 个
    let mut files: Vec<_> = fs::read_dir(&backup_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().starts_with("desklist-"))
        .map(|e| e.path())
        .collect();
    files.sort();
    while files.len() > 7 {
        let rm = files.remove(0);
        let _ = fs::remove_file(rm);
    }
    Ok(())
}

fn migrate(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if v < 1 {
        conn.execute_batch(
            "BEGIN;
             CREATE TABLE plans (
               id              TEXT PRIMARY KEY,
               name            TEXT NOT NULL,
               color           TEXT NOT NULL DEFAULT 'violet',
               target_date     TEXT,
               next_step       TEXT,
               manual_progress REAL,
               notes           TEXT NOT NULL DEFAULT '',
               archived        INTEGER NOT NULL DEFAULT 0,
               position        INTEGER NOT NULL DEFAULT 0,
               created_at      TEXT NOT NULL
             );
             CREATE TABLE tasks (
               id         TEXT PRIMARY KEY,
               title      TEXT NOT NULL,
               notes      TEXT NOT NULL DEFAULT '',
               priority   INTEGER NOT NULL DEFAULT 2,
               due        TEXT,
               plan_id    TEXT REFERENCES plans(id) ON DELETE SET NULL,
               done       INTEGER NOT NULL DEFAULT 0,
               done_at    TEXT,
               position   INTEGER NOT NULL DEFAULT 0,
               created_at TEXT NOT NULL
             );
             CREATE INDEX idx_tasks_due ON tasks(due) WHERE done = 0;
             CREATE INDEX idx_tasks_plan ON tasks(plan_id);
             CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             PRAGMA user_version = 1;
             COMMIT;",
        )?;
    }
    if v < 2 {
        // v2: 任务可"排入今天"——存排入日期（NULL=未排），与截止日 due 独立
        conn.execute_batch(
            "BEGIN;
             ALTER TABLE tasks ADD COLUMN today TEXT;
             CREATE INDEX idx_tasks_today ON tasks(today) WHERE done = 0;
             PRAGMA user_version = 2;
             COMMIT;",
        )?;
    }
    Ok(())
}

fn now_str() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

fn date_offset(days: i64) -> String {
    (chrono::Local::now() + chrono::Duration::days(days))
        .format("%Y-%m-%d")
        .to_string()
}

fn seed(conn: &Connection) -> Result<(), rusqlite::Error> {
    let mk_plan = |conn: &Connection,
                   name: &str,
                   color: &str,
                   target: Option<&str>,
                   next: Option<&str>,
                   manual: Option<f64>|
     -> Result<String, rusqlite::Error> {
        let id = uuid::Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO plans(id,name,color,target_date,next_step,manual_progress,notes,archived,position,created_at)
             VALUES(?1,?2,?3,?4,?5,?6,'',0,0,?7)",
            params![id, name, color, target, next, manual, now_str()],
        )?;
        Ok(id)
    };
    let mk_task = |conn: &Connection,
                   title: &str,
                   priority: i64,
                   due: Option<&str>,
                   plan: Option<&str>,
                   done: bool,
                   pos: i64|
     -> Result<(), rusqlite::Error> {
        let id = uuid::Uuid::now_v7().to_string();
        let done_at = if done { Some(now_str()) } else { None };
        conn.execute(
            "INSERT INTO tasks(id,title,notes,priority,due,plan_id,done,done_at,position,created_at)
             VALUES(?1,?2,'',?3,?4,?5,?6,?7,?8,?9)",
            params![id, title, priority, due, plan, done as i64, done_at, pos, now_str()],
        )?;
        Ok(())
    };

    // 收件箱示例：今日事项
    let today = date_offset(0);
    mk_task(conn, "示例：回一封邮件（完成后划线沉底）", 0, Some(&today), None, true, 1)?;
    mk_task(conn, "示例：双击我改名，行内 ☀ 可排入今天", 1, Some(&today), None, false, 2)?;

    // 示例计划一（任务型，3/8）
    let launch = mk_plan(conn, "示例：项目上线冲刺", "violet", Some(&date_offset(12)), None, None)?;
    let launch_tasks = [
        ("需求梳理", true),
        ("方案设计", true),
        ("环境搭建", true),
        ("功能开发", false),
        ("联调测试", false),
        ("文档整理", false),
        ("灰度发布", false),
        ("复盘总结", false),
    ];
    for (i, (t, d)) in launch_tasks.iter().enumerate() {
        mk_task(conn, t, 1, Some(&date_offset(5 + i as i64 / 2)), Some(&launch), *d, i as i64 + 1)?;
    }

    // 示例计划二（学习型，手动进度）
    mk_plan(
        conn,
        "示例：语言学习",
        "sky",
        None,
        Some("背完第 3 课单词"),
        Some(0.2),
    )?;

    // 示例计划三（任务型，1/5）
    let reading = mk_plan(conn, "示例：阅读周", "emerald", Some(&date_offset(7)), None, None)?;
    let reading_tasks = [
        ("选书并订计划", true),
        ("第一章", false),
        ("第二章", false),
        ("第三章", false),
        ("笔记整理", false),
    ];
    for (i, (t, d)) in reading_tasks.iter().enumerate() {
        mk_task(conn, t, 2, None, Some(&reading), *d, i as i64 + 1)?;
    }

    // 示例计划四（学习型）
    mk_plan(
        conn,
        "示例：健身打卡",
        "amber",
        None,
        Some("本周去 3 次健身房"),
        Some(0.4),
    )?;
    Ok(())
}
