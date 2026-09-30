import { ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/Progress';
import { useDragRegion } from '../../lib/drag';
import { api } from '../../lib/api';
import { openMain } from '../../lib/window';
import type { Task } from '../../lib/types';

/** 迷你模式：胶囊一行，只显示「下一件事」（今日准入：排入今天 ∨ 截止≤今天）。 */
export default function MiniBar({ today, tasks }: { today: string; tasks: Task[] }) {
  const drag = useDragRegion(() => openMain());
  const pool = tasks
    .filter(
      (t) =>
        (!t.done && (t.today !== null || (t.due !== null && t.due <= today))) ||
        (t.done && (t.doneAt ?? '').startsWith(today)),
    )
    .sort((a, b) => a.priority - b.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const next = pool.find((t) => !t.done);
  const total = pool.length;
  const done = pool.filter((t) => t.done).length;
  return (
    <div {...drag} className="flex h-11 select-none items-center gap-2.5 px-3">
      <ProgressRing value={total > 0 ? done / total : 0} size={22} stroke={2.5} />
      <span className="flex-1 truncate text-[12px] text-zinc-200" title="双击打开主窗">
        → {next ? next.title : '今天没有待办了'}
      </span>
      <div onPointerDown={(e) => e.stopPropagation()}>
        <Button
          size="icon-sm"
          title="展开"
          aria-label="展开悬浮窗"
          onClick={() => void api.setConfig('widget_mini', 'false')}
        >
          <ChevronUp size={14} />
        </Button>
      </div>
    </div>
  );
}
