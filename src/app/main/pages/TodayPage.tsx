import { usePlans, useTasks } from '../../../features/tasks/hooks';
import TaskRow from '../../../features/tasks/TaskRow';
import QuickAdd from '../../../features/tasks/QuickAdd';
import type { Task } from '../../../lib/types';
import { todayStr } from '../../../lib/dates';

interface Props {
  onEdit: (t: Task) => void;
}

export default function TodayPage({ onEdit }: Props) {
  const { data: tasks } = useTasks();
  const { data: plans } = usePlans();
  const today = todayStr();
  const all = tasks ?? [];

  // 今天 = 显式排入（today 标记）∨ 截止就是今天；已过期的任务归入"过期"分组，不重复计入今天
  const overdue = all.filter((t) => !t.done && t.due !== null && t.due < today);
  const overdueIds = new Set(overdue.map((t) => t.id));
  const dueToday = all.filter(
    (t) => !t.done && !overdueIds.has(t.id) && (t.today !== null || t.due === today),
  );
  const inbox = all.filter((t) => !t.done && t.today === null && t.due === null);
  const doneToday = all.filter((t) => t.done && (t.doneAt ?? '').startsWith(today));

  const sections: Array<{ title: string; items: Task[]; dim?: boolean }> = [
    { title: `今天 · ${dueToday.length}`, items: dueToday },
    { title: `过期 · ${overdue.length}`, items: overdue },
    { title: `收件箱 · ${inbox.length}`, items: inbox },
    { title: `已完成 · ${doneToday.length}`, items: doneToday, dim: true },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-8 py-7">
      <h1 className="text-xl font-semibold text-zinc-100">今日</h1>
      <p className="mt-1 text-[13px] text-zinc-500">
        今天 {dueToday.length + doneToday.length} 项 · 过期 {overdue.length} · 收件箱 {inbox.length}。
        任务行的 ☀ 可排入今天，收件箱的任务也一样。
      </p>
      <div className="mt-5">
        <QuickAdd pin placeholder="添加今天的任务，回车确认" />
      </div>
      <div className="mt-3 flex flex-col gap-6">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-1.5 px-2 text-[11px] font-medium tracking-widest text-zinc-500">{s.title}</h2>
            <ul className="flex flex-col">
              {s.items.map((t) => (
                <TaskRow key={t.id} task={t} plans={plans ?? []} onEdit={onEdit} />
              ))}
            </ul>
          </section>
        ))}
        {sections.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.1] px-6 py-10 text-center text-[13px] text-zinc-500">
            今天没有安排——喝口水，或添加第一件事
          </div>
        )}
      </div>
    </div>
  );
}
