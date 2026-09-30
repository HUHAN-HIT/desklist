import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCreateTask } from './hooks';

interface Props {
  due?: string | null;
  planId?: string | null;
  /** 创建即排入今天（今日意向，非截止日期） */
  pin?: boolean;
  placeholder?: string;
}

/** 快速添加：回车即入列。 */
export default function QuickAdd({ due = null, planId = null, pin = false, placeholder }: Props) {
  const [title, setTitle] = useState('');
  const create = useCreateTask();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = title.trim();
    if (!v) return;
    create.mutate({ title: v, priority: 2, due, planId, pinned: pin });
    setTitle('');
  };

  return (
    <form onSubmit={submit} className="px-3 pb-1.5 pt-0.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder ?? '添加任务，回车确认'}
        className="h-8 w-full rounded-lg border border-white/[0.07] bg-white/[0.05] px-2.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-[var(--accent)] focus:outline-none"
      />
    </form>
  );
}
