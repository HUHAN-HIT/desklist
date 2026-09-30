import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { todayStr } from '../../lib/dates';
import type { CreatePlanInput, CreateTaskInput, Plan, Task } from '../../lib/types';

export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: api.listTasks });
}

export function usePlans() {
  return useQuery({ queryKey: ['plans'], queryFn: api.listPlans });
}

export function useCreateTask() {
  return useMutation({ mutationFn: (input: CreateTaskInput) => api.createTask(input) });
}

export function useUpdateTask() {
  return useMutation({ mutationFn: (task: Task) => api.updateTask(task) });
}

export function useDeleteTask() {
  return useMutation({ mutationFn: (taskId: string) => api.deleteTask(taskId) });
}

/** 勾选即本地乐观更新，Rust 落库后事件校准。 */
export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => api.toggleTask(id, done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')} ${now.toTimeString().slice(0, 8)}`;
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, done, doneAt: done ? stamp : null } : t,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

/** 排入今天/取消：本地乐观更新，跨天未完成的保留（pinAge>0 前端提示"昨天排的"）。 */
export function usePinTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => api.pinTask(id, pinned),
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, today: pinned ? todayStr() : null } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCreatePlan() {
  return useMutation({ mutationFn: (input: CreatePlanInput) => api.createPlan(input) });
}

export function useUpdatePlan() {
  return useMutation({ mutationFn: (plan: Plan) => api.updatePlan(plan) });
}

export function useDeletePlan() {
  return useMutation({ mutationFn: (planId: string) => api.deletePlan(planId) });
}

export function useReorderPlans() {
  return useMutation({ mutationFn: (planIds: string[]) => api.reorderPlans(planIds) });
}

/** 计划进度：优先手动（学习型），否则 done/total。 */
export function planProgress(p: Plan): number {
  if (p.manualProgress !== null && p.manualProgress !== undefined) return p.manualProgress;
  if (p.taskTotal === 0) return 0;
  return p.taskDone / p.taskTotal;
}

export function planProgressLabel(p: Plan): string {
  if (p.manualProgress !== null && p.manualProgress !== undefined) {
    return `${Math.round(p.manualProgress * 100)}%`;
  }
  return `${p.taskDone}/${p.taskTotal}`;
}
