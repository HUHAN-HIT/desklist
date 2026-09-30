import { invoke } from '@tauri-apps/api/core';
import type { CreatePlanInput, CreateTaskInput, DayCount, Plan, Task } from './types';

export const api = {
  // tasks
  listTasks: () => invoke<Task[]>('list_tasks'),
  createTask: (input: CreateTaskInput) =>
    invoke<Task>('create_task', {
      title: input.title,
      priority: input.priority,
      due: input.due ?? null,
      planId: input.planId ?? null,
      pinned: input.pinned ?? false,
    }),
  updateTask: (task: Task) => invoke<Task>('update_task', { task }),
  toggleTask: (taskId: string, done: boolean) => invoke<Task>('toggle_task', { taskId, done }),
  pinTask: (taskId: string, pinned: boolean) => invoke<Task>('pin_today', { taskId, pinned }),
  deleteTask: (taskId: string) => invoke<void>('delete_task', { taskId }),

  // plans
  listPlans: () => invoke<Plan[]>('list_plans'),
  createPlan: (input: CreatePlanInput) =>
    invoke<Plan>('create_plan', {
      name: input.name,
      color: input.color,
      targetDate: input.targetDate ?? null,
      nextStep: input.nextStep ?? null,
      manual: input.manual ?? null,
    }),
  updatePlan: (plan: Plan) => invoke<Plan>('update_plan', { plan }),
  deletePlan: (planId: string) => invoke<void>('delete_plan', { planId }),
  reorderPlans: (planIds: string[]) => invoke<void>('reorder_plans', { planIds }),

  // config
  getConfig: (key: string) => invoke<string | null>('get_config', { key }),
  setConfig: (key: string, value: string) => invoke<void>('set_config', { key, value }),

  // misc
  statsDaily: (days: number) => invoke<DayCount[]>('stats_daily', { days }),
  exportData: (path: string) => invoke<void>('export_data', { path }),
  importData: (path: string) => invoke<void>('import_data', { path }),
  setAutostart: (enabled: boolean) => invoke<void>('set_autostart', { enabled }),
  getAutostart: () => invoke<boolean>('get_autostart'),
};
