import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { todayStr } from './dates';

/**
 * 常驻场景的跨天刷新：每 30 秒对时，日期一变——
 * 1) setDay 触发本组件树整体重渲染（今日过滤、相对日期"今天/明天"重新计算）；
 * 2) invalidateQueries 让依赖日期窗口的查询（如统计 30 天）重取。
 * 背景：TanStack 结构共享下，数据未变的 refetch 不会触发重渲染，
 * 所以必须靠本地 state 变更强制重算，光 invalidate 不够。
 */
export function useDayRollover(): string {
  const qc = useQueryClient();
  const [day, setDay] = useState(todayStr());
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = todayStr();
      if (now !== day) {
        setDay(now);
        void qc.invalidateQueries();
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [day, qc]);
  return day;
}
