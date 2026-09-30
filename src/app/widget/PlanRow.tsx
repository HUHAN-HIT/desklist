import { ProgressBar } from '../../components/ui/Progress';
import { planProgress, planProgressLabel } from '../../features/tasks/hooks';
import type { Plan, Task } from '../../lib/types';
import { ACCENTS } from '../../lib/theme';
import { openMain } from '../../lib/window';

/** widget 紧凑计划行：名称 + 进度 + 下一步。 */
export default function PlanRow({ plan, tasks }: { plan: Plan; tasks: Task[] }) {
  const progress = planProgress(plan);
  const firstUndone = tasks.find((t) => t.planId === plan.id && !t.done);
  const next = plan.nextStep ?? firstUndone?.title ?? '—';
  return (
    <li
      className="mx-2 cursor-pointer rounded-lg px-1.5 py-1.5 hover:bg-white/[0.045]"
      onClick={() => openMain()}
      title="点击打开主窗管理"
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ACCENTS[plan.color] ?? ACCENTS.violet }} />
        <span className="flex-1 truncate text-[12.5px] text-zinc-200">{plan.name}</span>
        <span className="shrink-0 text-[10.5px] tabular-nums text-zinc-500">{planProgressLabel(plan)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 pl-3.5">
        <ProgressBar value={progress} className="w-14 shrink-0" />
        <span className="truncate text-[10.5px] text-zinc-400">→ {next}</span>
      </div>
    </li>
  );
}
