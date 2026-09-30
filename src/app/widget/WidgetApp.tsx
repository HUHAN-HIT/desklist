import { AnimatePresence } from 'framer-motion';
import { useAutoHeight, useMaxContentHeight } from '../../lib/autoHeight';
import { useDayRollover } from '../../lib/useDayRollover';
import { useDbSync } from '../../lib/events';
import { useAccentEffect } from '../../lib/theme';
import { useConfigBool, useConfig } from '../../lib/config';
import { usePlans, useTasks } from '../../features/tasks/hooks';
import { todayStr } from '../../lib/dates';
import WidgetHeader from './WidgetHeader';
import WidgetTaskRow from './WidgetTaskRow';
import PlanRow from './PlanRow';
import MiniBar from './MiniBar';
import QuickAdd from '../../features/tasks/QuickAdd';

export default function WidgetApp() {
  useDbSync();
  useAccentEffect();
  useDayRollover();
  const { data: tasks } = useTasks();
  const { data: plans } = usePlans();
  const mini = useConfigBool('widget_mini', false);
  const { data: opacityRaw } = useConfig('widget_opacity');
  const rootRef = useAutoHeight<HTMLDivElement>();
  const maxContent = useMaxContentHeight(0.6);

  const alpha = Math.min(95, Math.max(55, Number(opacityRaw ?? 86))) / 100;
  const bg = `rgba(24,24,27,${alpha})`;

  if (mini) {
    return (
      <div ref={rootRef} className="widget-shell" style={{ backgroundColor: bg }}>
        <MiniBar today={todayStr()} tasks={tasks ?? []} />
      </div>
    );
  }

  const today = todayStr();
  const all = tasks ?? [];
  // 今日清单准入：排入今天（today 标记）∨ 截止日 ≤ 今天；加上今天完成的（划线沉底）。
  // 排入今天是显式动作，跨天未完成的保留（行内提示"昨天/N天"）。
  // 排序：优先级升序，同级按截止日升序（无截止的排最后）。
  const undoneToday = all
    .filter((t) => !t.done && (t.today !== null || (t.due !== null && t.due <= today)))
    .sort((a, b) => a.priority - b.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const doneToday = all.filter((t) => t.done && (t.doneAt ?? '').startsWith(today));
  const rows = [...undoneToday, ...doneToday];
  const activePlans = (plans ?? []).filter((p) => !p.archived);

  return (
    <div ref={rootRef} className="widget-shell" style={{ backgroundColor: bg }}>
      <WidgetHeader done={doneToday.length} total={undoneToday.length + doneToday.length} />
      <div className="overflow-x-hidden overflow-y-auto pb-2.5" style={{ maxHeight: maxContent }}>
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {rows.map((t) => (
              <WidgetTaskRow key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </ul>
        {rows.length === 0 && (
          <div className="px-3.5 py-2 text-[11.5px] text-zinc-500">今天没有安排——喝口水，或添加第一件事</div>
        )}
        <QuickAdd pin placeholder="添加今日任务，回车确认" />

        {activePlans.length > 0 && (
          <>
            <div className="mx-3.5 my-2 border-t border-white/[0.07]" />
            <div className="px-3.5 pb-1 text-[10px] font-medium tracking-[0.14em] text-zinc-500">进行中</div>
            <ul className="flex flex-col">
              {activePlans.map((p) => (
                <PlanRow key={p.id} plan={p} tasks={all} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
