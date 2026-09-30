import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProgressBar } from '../../../components/ui/Progress';
import { api } from '../../../lib/api';
import { addDaysStr, todayStr } from '../../../lib/dates';
import { planProgress, planProgressLabel, usePlans } from '../../../features/tasks/hooks';

export default function StatsPage() {
  const { data: stats } = useQuery({
    queryKey: ['stats', 30],
    queryFn: () => api.statsDaily(30),
  });
  const { data: plans } = usePlans();

  // 补全 30 天连续序列（无完成的天计 0）
  const data = (() => {
    const map = new Map((stats ?? []).map((s) => [s.day, s.count]));
    const out: Array<{ day: string; count: number }> = [];
    const today = todayStr();
    for (let i = 29; i >= 0; i--) {
      const d = addDaysStr(today, -i);
      out.push({ day: d.slice(5).replace('-', '/'), count: map.get(d) ?? 0 });
    }
    return out;
  })();

  const total = data.reduce((s, d) => s + d.count, 0);
  const activePlans = (plans ?? []).filter((p) => !p.archived);

  return (
    <div className="mx-auto max-w-3xl px-8 py-7">
      <h1 className="text-xl font-semibold text-zinc-100">统计</h1>
      <p className="mt-1 text-[13px] text-zinc-500">近 30 天完成 {total} 项任务</p>

      <div className="mt-6 h-48 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#71717a' }} interval={4} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#a1a1aa' }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Bar dataKey="count" name="完成" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2 className="mb-2 mt-8 text-[11px] font-medium tracking-widest text-zinc-500">进行中的计划</h2>
      <div className="flex flex-col gap-3">
        {activePlans.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] text-zinc-200">{p.name}</span>
              <span className="text-[11px] tabular-nums text-zinc-500">{planProgressLabel(p)}</span>
            </div>
            <ProgressBar value={planProgress(p)} />
          </div>
        ))}
        {activePlans.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/[0.1] px-6 py-8 text-center text-[13px] text-zinc-500">
            没有进行中的计划
          </div>
        )}
      </div>
    </div>
  );
}
