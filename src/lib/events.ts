import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';

/**
 * 监听 Rust 侧 db://changed 广播，失效全部查询。
 * 两窗各自挂载，实现双窗数据一致。
 */
export function useDbSync() {
  const qc = useQueryClient();
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    listen<{ entity: string }>('db://changed', () => {
      void qc.invalidateQueries();
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [qc]);
}
