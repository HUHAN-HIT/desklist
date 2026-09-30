import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Dialog } from '../../../components/ui/Dialog';
import { Input, TextArea } from '../../../components/ui/Input';
import { ProgressRing, ProgressBar } from '../../../components/ui/Progress';
import TaskRow from '../../../features/tasks/TaskRow';
import QuickAdd from '../../../features/tasks/QuickAdd';
import {
  planProgress,
  planProgressLabel,
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useReorderPlans,
  useTasks,
  useUpdatePlan,
} from '../../../features/tasks/hooks';
import type { Plan, Task } from '../../../lib/types';
import { ACCENTS } from '../../../lib/theme';
import { dueInfo } from '../../../lib/dates';
import { toast } from '../../../stores/toast';
import { cn } from '../../../lib/cn';

export default function PlansPage({ onEdit }: { onEdit: (t: Task) => void }) {
  const { data: plans } = usePlans();
  const { data: tasks } = useTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const reorder = useReorderPlans();
  const dragged = useRef(false);
  const [orderIds, setOrderIds] = useState<string[] | null>(null);

  const all = plans ?? [];
  const active = useMemo(() => all.filter((p) => !p.archived), [all]);
  const archived = all.filter((p) => p.archived);
  // 手动排序优先：本地顺序为准，新建/外部新增的计划追加到末尾
  const display = useMemo(() => {
    if (!orderIds) return active;
    const idx = new Map(orderIds.map((id, i) => [id, i]));
    const known = active.filter((p) => idx.has(p.id)).sort((a, b) => idx.get(a.id)! - idx.get(b.id)!);
    const added = active.filter((p) => !idx.has(p.id));
    return [...known, ...added];
  }, [active, orderIds]);

  const handleReorder = (ids: string[]) => {
    setOrderIds(ids);
    reorder.mutate(ids, {
      // 失败才回退到服务端顺序，成功则保留本地顺序等事件回流校准（避免闪跳）
      onError: () => {
        setOrderIds(null);
        toast('排序保存失败，已还原，请重试');
      },
    });
  };
  const selected = all.find((p) => p.id === selectedId) ?? active[0] ?? null;

  useEffect(() => {
    if (!selected && active.length > 0) setSelectedId(active[0].id);
  }, [selected, active]);

  return (
    <div className="flex h-full">
      {/* 计划列表 */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] px-3 py-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h1 className="text-[15px] font-semibold text-zinc-100">计划</h1>
          <Button size="icon-sm" variant="subtle" title="新建计划" aria-label="新建计划" onClick={() => setCreating(true)}>
            <Plus size={14} />
          </Button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Reorder.Group
            axis="y"
            values={display.map((p) => p.id)}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5"
          >
            {display.map((p) => (
              <Reorder.Item
                key={p.id}
                value={p.id}
                className={cn(
                  'group flex cursor-grab select-none items-center gap-1.5 rounded-lg px-1.5 py-2 active:cursor-grabbing',
                  selected?.id === p.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                )}
                whileDrag={{
                  zIndex: 10,
                  backgroundColor: 'rgba(39,39,42,0.97)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                }}
                onClick={() => {
                  if (!dragged.current) setSelectedId(p.id);
                }}
                onDragStart={() => (dragged.current = true)}
                onDragEnd={() => window.setTimeout(() => (dragged.current = false), 60)}
              >
                <GripVertical
                  size={12}
                  className="shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100"
                />
                <ProgressRing value={planProgress(p)} size={22} stroke={2.5} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-zinc-200">{p.name}</div>
                  <div className="text-[10.5px] text-zinc-500">
                    {p.targetDate ? `截止 ${dueInfo(p.targetDate).label ?? p.targetDate.slice(5)}` : '无截止'} ·{' '}
                    {planProgressLabel(p)}
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {archived.length > 0 && (
            <button
              type="button"
              className="mt-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-500 hover:text-zinc-300"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? '▾' : '▸'} 已归档 · {archived.length}
            </button>
          )}
          {showArchived &&
            archived.map((p) => (
              <button
                key={p.id}
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left opacity-55',
                  selected?.id === p.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]',
                )}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="truncate text-[12.5px] text-zinc-400">{p.name}</span>
              </button>
            ))}
        </div>
      </div>

      {/* 计划详情 */}
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {selected ? (
          <PlanDetail key={selected.id} plan={selected} tasks={tasks ?? []} onEdit={onEdit} />
        ) : (
          <div className="grid h-full place-items-center text-[13px] text-zinc-500">
            还没有计划——点击左上角 + 新建一个
          </div>
        )}
      </div>

      <NewPlanDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function PlanDetail({ plan, tasks, onEdit }: { plan: Plan; tasks: Task[]; onEdit: (t: Task) => void }) {
  const update = useUpdatePlan();
  const del = useDeletePlan();
  const { data: plans } = usePlans();
  const isStudy = plan.manualProgress !== null && plan.manualProgress !== undefined;
  const planTasks = tasks.filter((t) => t.planId === plan.id);
  const target = plan.targetDate ? dueInfo(plan.targetDate) : null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 手动进度滑块走本地草稿：onChange 直写会形成"每帧写库→广播→refetch 回写"风暴，
  // 且拖动中 value 被服务端数据重置导致回跳。拖动仅改本地，释放/失焦才提交。
  const [progressDraft, setProgressDraft] = useState<number | null>(null);
  const progressView = progressDraft ?? planProgress(plan);
  const commitProgress = () => {
    if (progressDraft !== null && Math.abs(progressDraft - planProgress(plan)) > 1e-9) {
      update.mutate({ ...plan, manualProgress: progressDraft });
    }
    setProgressDraft(null);
  };
  // 名称走本地草稿：受控直绑异步数据会在每个按键触发 回写→打断 IME 组合（中文变裸拼音），
  // 且 refetch 程序化重写 value 会吃掉正在输入的内容。失焦/回车才提交。
  const [nameDraft, setNameDraft] = useState(plan.name);
  const commitName = () => {
    const v = nameDraft.trim();
    if (v && v !== plan.name) update.mutate({ ...plan, name: v });
    else setNameDraft(plan.name);
  };
  // 类型互转：学习型→任务型清掉手动进度改为自动统计；
  // 任务型→学习型以当前自动进度作为手动起点，避免进度跳变。
  const setType = (study: boolean) => {
    if (study === isStudy) return;
    update.mutate({
      ...plan,
      manualProgress: study ? (plan.taskTotal > 0 ? plan.taskDone / plan.taskTotal : 0) : null,
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-xl font-semibold text-zinc-100 focus:outline-none"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
            }}
            onBlur={commitName}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-zinc-500">
            <label className="flex items-center gap-1.5">
              截止
              <input
                type="date"
                className="rounded border border-white/[0.09] bg-white/[0.05] px-1.5 py-0.5 text-[12px] text-zinc-300"
                value={plan.targetDate ?? ''}
                onChange={(e) => update.mutate({ ...plan, targetDate: e.target.value || null })}
              />
            </label>
            {target && target.tone === 'overdue' && <span className="text-rose-400">已过期</span>}
            <span className="tabular-nums">{isStudy ? '学习型' : `${plan.taskDone}/${plan.taskTotal} 任务`}</span>
            <div className="flex items-center overflow-hidden rounded-md border border-white/[0.12]">
              <button
                type="button"
                onClick={() => setType(false)}
                className={cn(
                  'px-2 py-0.5 text-[11px] transition-colors',
                  !isStudy ? 'bg-[var(--accent)]/20 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                任务型
              </button>
              <button
                type="button"
                onClick={() => setType(true)}
                className={cn(
                  'px-2 py-0.5 text-[11px] transition-colors',
                  isStudy ? 'bg-[var(--accent)]/20 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                学习型
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-1.5">
          <ProgressRing value={planProgress(plan)} size={44} stroke={4} />
          <div className="flex flex-col gap-1 pt-0.5">
            <Button
              size="icon-sm"
              variant="ghost"
              title={plan.archived ? '取消归档' : '归档计划'}
              aria-label={plan.archived ? '取消归档' : '归档计划'}
              onClick={() => update.mutate({ ...plan, archived: !plan.archived })}
            >
              <Archive size={13} />
            </Button>
            <Button
              size="icon-sm"
              variant="danger"
              title="删除计划"
              aria-label="删除计划"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </div>

      {/* 下一步 */}
      <div className="mt-5">
        <span className="mb-1.5 block text-[11px] font-medium tracking-widest text-zinc-500">下一步</span>
        <Input
          placeholder="一句话：接下来干什么（会显示在悬浮窗上）"
          defaultValue={plan.nextStep ?? ''}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (plan.nextStep ?? '')) update.mutate({ ...plan, nextStep: v || null });
          }}
        />
      </div>

      {/* 计划介绍 */}
      <div className="mt-4">
        <span className="mb-1.5 block text-[11px] font-medium tracking-widest text-zinc-500">介绍</span>
        <TextArea
          rows={3}
          placeholder="计划背景、目标、参考资料…（失焦自动保存）"
          defaultValue={plan.notes}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== plan.notes) update.mutate({ ...plan, notes: v });
          }}
        />
      </div>

      {/* 学习型：手动进度 */}
      {isStudy && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-widest text-zinc-500">进度（手动）</span>
            <span className="text-[12px] tabular-nums text-zinc-400">{Math.round(progressView * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(progressView * 100)}
            className="w-full accent-[var(--accent)]"
            onChange={(e) => setProgressDraft(Number(e.target.value) / 100)}
            onPointerUp={commitProgress}
            onKeyUp={commitProgress}
            onBlur={commitProgress}
          />
        </div>
      )}

      {/* 任务型：任务列表 */}
      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-widest text-zinc-500">任务</span>
          {!isStudy && <ProgressBar value={planProgress(plan)} className="w-32" />}
        </div>
        <QuickAdd planId={plan.id} placeholder="为此计划添加任务，回车确认" />
        <ul className="mt-1.5 flex flex-col">
          {planTasks.map((t) => (
            <TaskRow key={t.id} task={t} plans={plans ?? []} onEdit={onEdit} />
          ))}
        </ul>
        {!isStudy && planTasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/[0.1] px-4 py-6 text-center text-[12.5px] text-zinc-500">
            还没有任务
          </div>
        )}
      </div>

      {/* 删除确认：计划删除后任务转入收件箱（外键 SET NULL），但操作仍需显式确认 */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="删除计划"
        width={380}
        footer={
          <>
            <Button variant="subtle" size="sm" onClick={() => setConfirmDelete(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-rose-500 hover:brightness-110"
              onClick={() => {
                del.mutate(plan.id);
                setConfirmDelete(false);
                toast('计划已删除，任务转入收件箱');
              }}
            >
              删除
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-zinc-300">
          确定删除计划「{plan.name}」？
          <br />
          其中的任务会转入收件箱，不会被删除；此操作不可撤销。
        </p>
      </Dialog>
    </div>
  );
}

function NewPlanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePlan();
  const [name, setName] = useState('');
  const [type, setType] = useState<'tasks' | 'study'>('tasks');
  const [color, setColor] = useState('violet');
  const [target, setTarget] = useState('');
  const [nextStep, setNextStep] = useState('');

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    create.mutate(
      {
        name: n,
        color,
        targetDate: target || null,
        nextStep: nextStep.trim() || null,
        manual: type === 'study' ? 0 : null,
      },
      { onSuccess: () => toast('计划已创建') },
    );
    setName('');
    setType('tasks');
    setTarget('');
    setNextStep('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="新建计划"
      footer={
        <>
          <Button variant="subtle" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>
            创建
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">名称</span>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="如：CS336 A1 冲刺" />
        </label>
        <div>
          <span className="mb-1.5 block text-xs text-zinc-400">类型</span>
          <div className="flex gap-1.5">
            {(
              [
                ['tasks', '任务型（自动进度）'],
                ['study', '学习型（手动进度）'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={cn(
                  'h-9 flex-1 rounded-lg border text-[13px] transition-colors',
                  type === v
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-zinc-100'
                    : 'border-white/[0.09] bg-white/[0.04] text-zinc-400 hover:text-zinc-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs text-zinc-400">颜色</span>
          <div className="flex gap-2">
            {Object.entries(ACCENTS).map(([key, hex]) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                onClick={() => setColor(key)}
                className={cn(
                  'h-7 w-7 rounded-full transition-transform',
                  color === key && 'scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-900',
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-zinc-400">目标日期（可选）</span>
          <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        {type === 'study' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">下一步（可选，显示在悬浮窗）</span>
            <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="一句话" />
          </label>
        )}
      </div>
    </Dialog>
  );
}
