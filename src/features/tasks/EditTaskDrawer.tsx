import { useEffect, useState } from 'react';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Input, TextArea, Select } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { useDeleteTask, useUpdateTask } from './hooks';
import type { Plan, Priority, Task } from '../../lib/types';
import { PRIORITY_COLORS } from '../../lib/theme';
import { todayStr } from '../../lib/dates';
import { toast } from '../../stores/toast';
import { cn } from '../../lib/cn';

interface Props {
  task: Task | null;
  plans: Plan[];
  onClose: () => void;
}

interface FormState {
  title: string;
  notes: string;
  priority: Priority;
  due: string;
  planId: string;
  pinned: boolean;
}

export default function EditTaskDrawer({ task, plans, onClose }: Props) {
  const update = useUpdateTask();
  const del = useDeleteTask();
  const [form, setForm] = useState<FormState>({
    title: '',
    notes: '',
    priority: 2,
    due: '',
    planId: '',
    pinned: false,
  });

  // 只按任务 id 重置表单：按 task 对象重置会在任何数据刷新（含其他窗口的写入）时
  // 清掉用户正在输入的内容并打断 IME 组合
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        due: task.due ?? '',
        planId: task.planId ?? '',
        pinned: task.today !== null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task) return null;

  const save = () => {
    update.mutate({
      ...task,
      title: form.title.trim() || task.title,
      notes: form.notes,
      priority: form.priority,
      due: form.due || null,
      planId: form.planId || null,
      // 已排且保持排入：保留原排入日期（"昨天排的"提示依据）；新排：记本地今天
      // （todayStr 而非 toISOString——后者是 UTC，东八区早 8 点前会记成昨天）
      today: form.pinned ? (task.today ?? todayStr()) : null,
    });
    onClose();
  };

  return (
    <Drawer open={!!task} onClose={onClose} title="编辑任务">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">标题</span>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
        </label>

        <div>
          <span className="mb-1.5 block text-xs text-zinc-400">优先级</span>
          <div className="flex gap-1.5">
            {([0, 1, 2] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm((f) => ({ ...f, priority: p }))}
                className={cn(
                  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[13px] transition-colors',
                  form.priority === p
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-zinc-100'
                    : 'border-white/[0.09] bg-white/[0.04] text-zinc-400 hover:text-zinc-200',
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }} />
                {['高', '中', '低'][p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">截止日期</span>
            <Input
              type="date"
              value={form.due}
              onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">所属计划</span>
            <Select value={form.planId} onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}>
              <option value="">（收件箱）</option>
              {plans
                .filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
          <div>
            <div className="text-[13px] text-zinc-200">排入今天</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">今日意向，与截止日期无关；未完成会保留</div>
          </div>
          <Switch
            checked={form.pinned}
            onChange={(v) => setForm((f) => ({ ...f, pinned: v }))}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">介绍 / 备注</span>
          <TextArea
            rows={4}
            value={form.notes}
            placeholder="补充说明、链接、上下文…"
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </label>

        <div className="mt-2 flex items-center justify-between">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              del.mutate(task.id);
              toast('已删除任务');
              onClose();
            }}
          >
            删除任务
          </Button>
          <div className="flex gap-2">
            <Button variant="subtle" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={save}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
