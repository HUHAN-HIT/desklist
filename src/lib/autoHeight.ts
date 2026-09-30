import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';

const WIDGET_WIDTH = 320;

/**
 * widget 高度自适应：ResizeObserver 监听内容根节点，
 * 高度变化 >2px 时调整窗口逻辑尺寸。
 * 内容区上限由 useMaxContentHeight 提供（基于屏幕高度，非窗口 vh）。
 */
export function useAutoHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = 0;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (Math.abs(h - last) > 2) {
        last = h;
        void getCurrentWindow().setSize(new LogicalSize(WIDGET_WIDTH, h + 1));
      }
    };
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(apply);
    });
    ro.observe(el);
    apply();
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

/**
 * 内容区最大高度（逻辑像素），按屏幕高度的比例计算。
 * 不能用 CSS 的 vh：窗口高度本身随内容自适应，vh 会跟着窗口变，
 * 形成反馈环（cap 永远追不上内容，最终收敛到极小值）。
 */
export function useMaxContentHeight(ratio = 0.6, fallback = 600) {
  const [cap, setCap] = useState(fallback);
  useEffect(() => {
    let disposed = false;
    void currentMonitor().then((m) => {
      if (disposed || !m) return;
      const logicalH = m.size.height / m.scaleFactor;
      setCap(Math.max(200, Math.round(logicalH * ratio)));
    });
    return () => {
      disposed = true;
    };
  }, [ratio]);
  return cap;
}
