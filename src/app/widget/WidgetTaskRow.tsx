import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { StickyNote } from 'lucide-react';
import { Checkbox } from '../../components/ui/Checkbox';
import { useToggleTask, useUpdateTask } from '../../features/tasks/hooks';
import type { Task } from '../../lib/types';
import { dueInfo, pinAge } from '../../lib/dates';
import { PRIORITY_COLORS } from '../../lib/theme';
import { cn } from '../../lib/cn';

/** widget 紧凑任务行：勾选 / 优先级点 / 截止 / 双击重命名。 */
export default function WidgetTaskRow({ task }: { task: Task }) {
  const toggle = useToggleTask();
  const update = useUpdateTask();
  const due = dueInfo(task.due);
  const stale = task.today !== null ? pinAge(task.today) : 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(task.title);
  }, [task.id]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== task.title) update.mutate({ ...task, title: v });
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.16 }}
      className="group mx-2 flex items-center gap-2 rounded-lg px-1.5 py-[5px] hover:bg-white/[0.045]"
    >
      <Checkbox checked={task.done} onChange={(v) => toggle.mutate({ id: task.id, done: v })} size={15} />
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS[2] }}
        aria-label={`优先级${['高', '中', '低'][task.priority] ?? '低'}`}
      />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            // isComposing：回车确认候选词时不得提交
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
            if (e.key === 'Escape') {
              setDraft(task.title);
              setEditing(false);
            }
          }}
          className="h-6 min-w-0 flex-1 rounded border border-[var(--accent)] bg-white/[0.07] px-1.5 text-[12.5px] text-zinc-100 focus:outline-none"
        />
      ) : (
        <span
          className={cn(
            'flex-1 cursor-default truncate text-[12.5px]',
            task.done ? 'text-zinc-600 line-through' : 'text-zinc-200',
          )}
          title={task.notes || '双击重命名'}
          onDoubleClick={() => setEditing(true)}
        >
          {task.title}
        </span>
      )}
      {task.notes && !editing && (
        <span className="shrink-0 text-zinc-600" title={task.notes}>
          <StickyNote size={11} />
        </span>
      )}
      {stale > 0 && !editing && (
        <span className="shrink-0 text-[10px] text-amber-300/70" title={`排入已有 ${stale} 天`}>
          {stale === 1 ? '昨天' : `${stale}天`}
        </span>
      )}
      {due.label && !editing && (
        <span
          className={cn(
            'shrink-0 rounded px-1 py-px text-[10px] leading-4',
            due.tone === 'overdue' && 'bg-rose-500/15 text-rose-300',
            due.tone === 'today' && 'bg-[var(--accent)]/20 text-[var(--accent)]',
            due.tone === 'soon' && 'bg-white/[0.07] text-zinc-400',
            due.tone === 'later' && 'text-zinc-500',
          )}
        >
          {due.label}
        </span>
      )}
    </motion.li>
  );
}
