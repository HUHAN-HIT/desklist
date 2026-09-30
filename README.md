# DeskList

常驻桌面的悬浮清单小组件 + 任务管理主窗。Tauri 2 + React + TypeScript。

## 功能

- **悬浮 Widget**：无边框 / 半透明 / 圆角 / 常驻置顶 / 不占任务栏；显示今日任务与进行中计划；高度自适应（上限为屏幕高度的 60%，超出内部滚动）
- **拖拽**：按住标题栏拖动；位置自动记忆，重启恢复
- **隐藏**：标题栏 ✕ 隐藏到托盘 / 托盘菜单 / 全局热键 `Ctrl+Alt+D` / 迷你模式（折叠成一行胶囊）
- **双击打开主窗**：双击 Widget 标题栏或点 ↗ 图标，进入完整管理界面（今日 / 计划 / 日历 / 统计 / 设置）
- **任务**：优先级 / 截止日期 / 所属计划 / 介绍；介绍可在任务行内展开编辑（失焦保存），悬浮窗悬停可查看
- **排入今天**：「今天 = 我今天的意向」与「截止日期 = 硬期限」是两个独立概念（Things 3 同款模型）：任务行 ☀ 或编辑抽屉可把任务排入今天，跨天未完成的保留并提示「昨天排的」；悬浮窗/主窗的今日区准入 = 排入今天 ∨ 截止≤今天
- **计划**：任务型（进度 = 完成数/总数，自动）与学习型（手动进度 + 「下一步」提示）；学习计划进度与下一步直接显示在悬浮窗上；计划列表支持拖拽排序（手动顺序持久化，悬浮窗同步该顺序）
- **数据**：SQLite（WAL）本地存储，双窗实时同步；每日启动自动备份（保留 7 份）；支持导出/导入 JSON

## 开发

依赖：Node ≥ 18、[Rust](https://rustup.rs)（MSVC toolchain）、Windows 上的 WebView2（Win11 自带）。

```bash
npm install
npm run tauri dev     # 开发模式（热重载）
npm run tauri build   # 打包 NSIS 安装包（输出 src-tauri/target/release/bundle/）
npm run icons         # 重新生成应用图标（改 scripts/gen-icons.mjs 后）
```

## 结构

```
src/                      前端（两窗共用一份代码，按 ?window= 参数分流）
├── app/widget/           悬浮小窗
├── app/main/             管理主窗（5 页面）
├── features/tasks/       任务域：hooks / 行组件 / 快速添加 / 编辑抽屉
├── components/ui/        基础组件（Button/Checkbox/Dialog/Drawer/Toast…）
└── lib/                  api/事件同步/拖拽/自动高度/日期/主题
src-tauri/
├── src/main.rs           插件装配、托盘、热键、单实例、窗口事件
├── src/db.rs             SQLite 初始化/迁移/种子数据/备份
└── src/commands/         tasks / plans / config / misc CRUD，变更广播 db://changed
scripts/gen-icons.mjs     纯 Node 图标生成（PNG/ICO 编码）
```

## 架构要点

- **单进程双窗**：widget 置顶透明 + main 懒显示（`visible:false`，双击唤起）。所有写操作走 Rust commands → SQLite → `db://changed` 事件 → 两窗 TanStack Query 失效重取，单数据源保证一致性。
- **拖拽不用 `data-tauri-drag-region`**（会吞双击）：手动位移阈值判定后 `startDragging()`，拖拽后短时间抑制双击，避免误开主窗。
- **不用系统亚克力/云母材质**：acrylic 会填满整个窗口矩形，盖住 CSS 圆角（四角变方）。背景用 CSS 半透明实现，圆角优先。
- **内容区上限按屏幕高度算，不用 vh**：窗口高度随内容自适应，vh 会跟着窗口变形成反馈环；改从 `currentMonitor()` 读屏幕尺寸换算逻辑像素封顶。
- **计划表吸收学习主题**：学习型计划 = 手动进度 + `next_step`；任务型 = 自动统计。悬浮窗优先显示 `next_step`，无则取第一条未完成任务。

## 数据位置

`%APPDATA%/com.desklist.app/`（desklist.db、backups/、logs/）。

## 已知边界

- 独占全屏的程序（全屏游戏/视频）会盖住置顶小窗——Windows 对所有置顶窗的统一行为。
- 未购买代码签名证书时，SmartScreen 首次安装会提示「更多信息 → 仍要运行」。

## 路线图（v0.2+）

- [ ] 到期托盘气泡提醒（`TrayIcon::set_tooltip` + `show_message`）
- [ ] 自动更新（tauri-plugin-updater：生成 minisign 密钥对，配置 endpoint 后启用）
- [ ] 浅色主题、任务拖拽排序、全局快速添加热键
- [ ] ESLint + vitest（当前仅有 tsc 类型检查）
