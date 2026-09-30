import { Maximize2, Minus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/Progress';
import { useDragRegion } from '../../lib/drag';
import { zhToday } from '../../lib/dates';
import { api } from '../../lib/api';
import { hideWidget, openMain } from '../../lib/window';

interface Props {
  done: number;
  total: number;
}

/** 标题栏：拖拽把手 + 双击开主窗 + 环形进度 + 三个操作。 */
export default function WidgetHeader({ done, total }: Props) {
  const drag = useDragRegion(() => openMain());
  const ratio = total > 0 ? done / total : 0;
  return (
    <header {...drag} className="relative flex select-none items-center justify-between px-3.5 pb-2 pt-3">
      <div className="flex min-w-0 items-center gap-2">
        <ProgressRing value={ratio} size={22} stroke={2.5} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-[12.5px] font-semibold text-zinc-100">{zhToday()}</span>
          <span className="text-[10px] text-zinc-500">
            今日 {done}/{total}
          </span>
        </div>
      </div>
      {/* 操作按钮不参与拖拽 */}
      <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
        <Button size="icon-sm" title="打开主窗口（或双击标题栏）" aria-label="打开主窗口" onClick={() => openMain()}>
          <Maximize2 size={13} />
        </Button>
        <Button
          size="icon-sm"
          title="迷你模式"
          aria-label="迷你模式"
          onClick={() => void api.setConfig('widget_mini', 'true')}
        >
          <Minus size={13} />
        </Button>
        <Button size="icon-sm" title="隐藏（Ctrl+Alt+D 呼出）" aria-label="隐藏" onClick={() => hideWidget()}>
          <X size={13} />
        </Button>
      </div>
    </header>
  );
}
