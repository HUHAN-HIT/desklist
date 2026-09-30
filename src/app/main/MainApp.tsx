import { useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart3, Calendar, ListTodo, Settings, Sun } from 'lucide-react';
import { Toaster } from '../../components/ui/Toaster';
import EditTaskDrawer from '../../features/tasks/EditTaskDrawer';
import { usePlans } from '../../features/tasks/hooks';
import { useDbSync } from '../../lib/events';
import { useDayRollover } from '../../lib/useDayRollover';
import { useAccentEffect } from '../../lib/theme';
import type { Task } from '../../lib/types';
import { cn } from '../../lib/cn';
import TodayPage from './pages/TodayPage';
import PlansPage from './pages/PlansPage';
import CalendarPage from './pages/CalendarPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

type Tab = 'today' | 'plans' | 'calendar' | 'stats' | 'settings';

const NAV: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'today', label: '今日', icon: <Sun size={16} /> },
  { id: 'plans', label: '计划', icon: <ListTodo size={16} /> },
  { id: 'calendar', label: '日历', icon: <Calendar size={16} /> },
  { id: 'stats', label: '统计', icon: <BarChart3 size={16} /> },
  { id: 'settings', label: '设置', icon: <Settings size={16} /> },
];

export default function MainApp() {
  useDbSync();
  useAccentEffect();
  useDayRollover();
  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Task | null>(null);
  const { data: plans } = usePlans();

  return (
    <div className="main-window flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <aside className="flex w-52 shrink-0 flex-col border-r border-white/[0.06] p-3">
        <div className="mb-5 flex items-center gap-2.5 px-2 pt-1.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-800 text-[13px] font-bold text-white">
            ✓
          </span>
          <span className="text-[15px] font-semibold tracking-tight">DeskList</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setTab(n.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                tab === n.id ? 'bg-white/[0.08] font-medium text-zinc-100' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
              )}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-2.5 pb-1 text-[10.5px] leading-relaxed text-zinc-600">
          小窗热键 Ctrl+Alt+D
          <br />
          v0.1.0
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {tab === 'today' && <TodayPage onEdit={setEditing} />}
        {tab === 'plans' && <PlansPage onEdit={setEditing} />}
        {tab === 'calendar' && <CalendarPage onEdit={setEditing} />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <EditTaskDrawer task={editing} plans={plans ?? []} onClose={() => setEditing(null)} />
      <Toaster />
    </div>
  );
}
