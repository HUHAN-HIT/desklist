export type Priority = 0 | 1 | 2;

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  /** YYYY-MM-DD，null = 无期限（收件箱） */
  due: string | null;
  /** 排入今天的日期（YYYY-MM-DD），null = 未排。与 due 独立：due=硬期限，today=今日意向 */
  today: string | null;
  planId: string | null;
  done: boolean;
  /** 本地时间 "YYYY-MM-DD HH:MM:SS"，null = 未完成 */
  doneAt: string | null;
  position: number;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  color: string;
  targetDate: string | null;
  /** 学习型计划的「下一步」；任务型计划也可设 */
  nextStep: string | null;
  /** 学习型手动进度 0~1；null = 任务型（自动算 done/total） */
  manualProgress: number | null;
  notes: string;
  archived: boolean;
  position: number;
  createdAt: string;
  taskTotal: number;
  taskDone: number;
}

export interface DayCount {
  day: string;
  count: number;
}

export interface CreateTaskInput {
  title: string;
  priority: number;
  due?: string | null;
  planId?: string | null;
  /** 创建即排入今天 */
  pinned?: boolean;
}

export interface CreatePlanInput {
  name: string;
  color: string;
  targetDate?: string | null;
  nextStep?: string | null;
  manual?: number | null;
}
