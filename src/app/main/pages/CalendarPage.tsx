import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import TaskRow from '../../../features/tasks/TaskRow';
import { usePlans, useTasks } from '../../../features/tasks/hooks';
import type { Task } from '../../../lib/types';
import { fmtLocal, todayStr } from '../../../lib/dates';
import { cn } from '../../../lib/cn';

const WEEK_HEADER = ['一', '二', '三', '四', '五', '六', '日'];

export default function CalendarPage({ onEdit }: { onEdit: (t: Task) => void }) {
  const { data: tasks } = useTasks();
  const { data: plans } = usePlans();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState(todayStr());
  const today = todayStr();

  const base = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const cells = useMemo(() => {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const startOffset = (first.getDay() + 6) % 7; // 周一开头
    return Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - startOffset + i));
  }, [base]);

  const byDue = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks ?? []) {
      if (!t.due) continue;
      const arr = map.get(t.due) ?? [];
      arr.push(t);
      map.set(t.due, arr);
    }
    return map;
  }, [tasks]);

  const selectedTasks = byDue.get(selected) ?? [];
  const monthLabel = `${base.getFullYear()}年${base.getMonth() + 1}月`;

  return (
    <div className="mx-auto max-w-3xl px-8 py-7">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-100">{monthLabel}</h1>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="subtle" aria-label="上个月" onClick={() => setMonthOffset((v) => v - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              setMonthOffset(0);
              setSelected(today);
            }}
          >
            今天
          </Button>
          <Button size="icon-sm" variant="subtle" aria-label="下个月" onClick={() => setMonthOffset((v) => v + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1">
        {WEEK_HEADER.map((w) => (
          <div key={w} className="pb-1 text-center text-[11px] text-zinc-600">
            {w}
          </div>
        ))}
        {cells.map((d) => {
          const key = fmtLocal(d);
          const items = byDue.get(key) ?? [];
          const open = items.filter((t) => !t.done).length;
          const inMonth = d.getMonth() === base.getMonth();
          const isToday = key === today;
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={cn(
                'flex h-[52px] flex-col items-center gap-1 rounded-lg border pt-1.5 transition-colors',
                isSel ? 'border-[var(--accent)] bg-[var(--accent)]/12' : 'border-transparent hover:bg-white/[0.04]',
                !inMonth && 'opacity-35',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full text-[11.5px] tabular-nums',
                  isToday ? 'bg-[var(--accent)] font-semibold text-white' : 'text-zinc-300',
                )}
              >
                {d.getDate()}
              </span>
              {open > 0 && (
                <span className="flex items-center gap-0.5 text-[9.5px] text-zinc-400">
                  <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
                  {open}
                </span>
              )}
              {open === 0 && items.length > 0 && <span className="text-[9.5px] text-zinc-600">✓{items.length}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-7">
        <h2 className="mb-1.5 px-2 text-[11px] font-medium tracking-widest text-zinc-500">
          {selected === today ? '今天' : selected.slice(5).replace('-', '/')} · {selectedTasks.length} 项
        </h2>
        <ul className="flex flex-col">
          {selectedTasks.map((t) => (
            <TaskRow key={t.id} task={t} plans={plans ?? []} onEdit={onEdit} />
          ))}
        </ul>
        {selectedTasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.1] px-6 py-8 text-center text-[13px] text-zinc-500">
            这天没有到期任务
          </div>
        )}
      </div>
    </div>
  );
}
