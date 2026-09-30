import { useRef } from 'react';
import type { PointerEvent as RPointerEvent, MouseEvent as RMouseEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * 悬浮窗手动拖拽 + 双击判定。
 * 不用 data-tauri-drag-region（它会吞掉 click/dblclick）：
 * 位移超阈值才 startDragging；拖拽后 700ms 内的双击被吞掉，避免误开主窗。
 */
export function useDragRegion(onDoubleClick?: () => void) {
  const s = useRef({ x: 0, y: 0, active: false, dragging: false, suppressUntil: 0 });
  return {
    onPointerDown: (e: RPointerEvent) => {
      if (e.button !== 0) return;
      const st = s.current;
      st.x = e.clientX;
      st.y = e.clientY;
      st.active = true;
      st.dragging = false;
    },
    onPointerMove: (e: RPointerEvent) => {
      const st = s.current;
      if (!st.active || st.dragging) return;
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > 4) {
        st.dragging = true;
        st.suppressUntil = Date.now() + 700;
        void getCurrentWindow().startDragging();
      }
    },
    onPointerUp: () => {
      s.current.active = false;
    },
    onDoubleClick: (_e: RMouseEvent) => {
      const now = Date.now();
      if (now < s.current.suppressUntil) {
        s.current.suppressUntil = 0;
        return;
      }
      onDoubleClick?.();
    },
  } as const;
}
