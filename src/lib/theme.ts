import { useEffect } from 'react';
import { useConfig } from './config';

export const ACCENTS: Record<string, string> = {
  violet: '#8b5cf6',
  sky: '#38bdf8',
  emerald: '#34d399',
  rose: '#fb7185',
  amber: '#fbbf24',
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: '#fb7185', // 高
  1: '#fbbf24', // 中
  2: '#71717a', // 低
};

/** 读取 accent 配置并写入 CSS 变量，两窗各自调用。 */
export function useAccentEffect() {
  const { data } = useConfig('accent');
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENTS[data ?? 'violet'] ?? ACCENTS.violet);
  }, [data]);
}
