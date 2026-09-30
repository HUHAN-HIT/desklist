import { useEffect, useState } from 'react';
import { StickyNote, Sun } from 'lucide-react';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { useDeleteTask, usePinTask, useToggleTask, useUpdateTask } from './hooks';
import type { Plan, Task } from '../../lib/types';
import { dueInfo, pinAge } from '../../lib/dates';
import { PRIORITY_COLORS, ACCENTS } from '../../lib/theme';
import { toast } from '../../stores/toast';
import { cn } from '../../lib/cn';

interface Props {
  task: Task;
  plans: Plan[];
  onEdit: (t: Task) => void;
}

/** 主窗任务行：hover 出排今天/介绍/删除，介绍可展开行内编辑，点击标题开编辑抽屉。 */
export default function TaskRow({ task, plans, onEdit }: Props) {
  const toggle = useToggleTask();
  const pin = usePinTask();
  const del = useDeleteTask();
  const update = useUpdateTask();
  const plan = plans.find((p) => p.id === task.planId);
  const due = dueInfo(task.due);
  const pinned = task.today !== null;
  const stale = task.today !== null ? pinAge(task.today) : 0;
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(task.notes);

  // 只按任务 id 重置草稿：按 notes 重置会在 refetch 回写时打断输入/IME 组合
  useEffect(() => {
    setDraft(task.notes);
  }, [task.id]);

  const onToggle = (v: boolean) => {
    toggle.mutate({ id: task.id, done: v });
    if (v) {
      toast('已完成 1 项', {
        label: '撤销',
        run: () => toggle.mutate({ id: task.id, done: false }),
      });
    }
  };

  const saveNotes = () => {
    if (draft !== task.notes) update.mutate({ ...task, notes: draft });
  };

  return (
    <li className="group rounded-lg px-2 hover:bg-white/[0.04]">
      <div className="flex items-center gap-2.5 py-2">
        <Checkbox checked={task.done} onChange={onToggle} />
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS[2] }}
          title={`优先级：${['高', '中', '低'][task.priority] ?? '低'}`}
        />
        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 truncate text-left text-[13px]',
            task.done ? 'text-zinc-600 line-through' : 'text-zinc-200 hover:text-white',
          )}
          onClick={() => onEdit(task)}
          title="点击编辑"
        >
          {task.title}
        </button>
        {stale > 0 && (
          <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-px text-[10.5px] text-amber-300/80">
            {stale === 1 ? '昨天排的' : `排了${stale}天`}
          </span>
        )}
        {plan && (
          <span
            className="shrink-0 rounded px-1.5 py-px text-[10.5px]"
            style={{ background: `${ACCENTS[plan.color] ?? ACCENTS.violet}22`, color: ACCENTS[plan.color] ?? ACCENTS.violet }}
          >
            {plan.name}
          </span>
        )}
        {due.label && (
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-px text-[10.5px]',
              due.tone === 'overdue' && 'bg-rose-500/15 text-rose-300',
              due.tone === 'today' && 'bg-[var(--accent)]/20 text-[var(--accent)]',
              due.tone === 'soon' && 'bg-white/[0.07] text-zinc-400',
              due.tone === 'later' && 'text-zinc-500',
            )}
          >
            {due.label}
          </span>
        )}
        <Button
          size="icon-sm"
          title={pinned ? '取消今天' : '排入今天'}
          aria-label={pinned ? '取消今天' : '排入今天'}
          className={cn(
            'transition-opacity',
            pinned ? 'text-[var(--accent)]' : 'text-zinc-500 opacity-0 hover:opacity-100 group-hover:opacity-100',
          )}
          onClick={() => pin.mutate({ id: task.id, pinned: !pinned })}
        >
          <Sun size={12} />
        </Button>
        <Button
          size="icon-sm"
          title={task.notes ? '查看 / 编辑介绍' : '添加介绍'}
          aria-label="任务介绍"
          className={cn(
            'transition-opacity',
            task.notes
              ? 'text-zinc-400'
              : 'text-zinc-500 opacity-0 hover:opacity-100 group-hover:opacity-100',
          )}
          onClick={() => setExpanded((v) => !v)}
        >
          <StickyNote size={12} />
        </Button>
        <Button
          size="icon-sm"
          variant="danger"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title="删除"
          aria-label="删除任务"
          onClick={() => {
            del.mutate(task.id);
            toast('已删除任务');
          }}
        >
          ✕
        </Button>
      </div>
      {expanded && (
        <div className="pb-2.5 pl-7 pr-6">
          <textarea
            autoFocus
            rows={Math.min(6, Math.max(2, Math.ceil(draft.length / 34)))}
            value={draft}
            placeholder="任务介绍：背景、步骤、链接…（失焦自动保存）"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveNotes}
            className="w-full resize-none rounded-lg border border-white/[0.09] bg-white/[0.05] px-2.5 py-2 text-[12.5px] leading-relaxed text-zinc-300 placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      )}
    </li>
  );
}
