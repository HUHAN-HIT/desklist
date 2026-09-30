import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { api } from '../../../lib/api';
import { useConfig, useSetConfig } from '../../../lib/config';
import { ACCENTS } from '../../../lib/theme';
import { todayStr } from '../../../lib/dates';
import { toast } from '../../../stores/toast';
import { cn } from '../../../lib/cn';

export default function SettingsPage() {
  const setConfig = useSetConfig();
  const { data: autostart } = useQuery({ queryKey: ['autostart'], queryFn: api.getAutostart });
  const { data: hotkeyRaw } = useConfig('hotkey');
  const { data: opacityRaw } = useConfig('widget_opacity');
  const { data: accentRaw } = useConfig('accent');

  const [hotkey, setHotkey] = useState('Ctrl+Alt+D');
  const [opacity, setOpacity] = useState(84);

  useEffect(() => {
    if (hotkeyRaw) setHotkey(hotkeyRaw);
  }, [hotkeyRaw]);
  useEffect(() => {
    if (opacityRaw) setOpacity(Number(opacityRaw));
  }, [opacityRaw]);

  const accent = accentRaw ?? 'violet';

  return (
    <div className="mx-auto max-w-2xl px-8 py-7">
      <h1 className="text-xl font-semibold text-zinc-100">设置</h1>

      <section className="mt-6 flex flex-col divide-y divide-white/[0.06] rounded-xl border border-white/[0.07] bg-white/[0.02]">
        {/* 开机自启 */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-[13.5px] text-zinc-200">开机自启</div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">登录后自动显示悬浮小窗</div>
          </div>
          <Switch
            checked={autostart ?? false}
            onChange={(v) => {
              void api.setAutostart(v).then(() => toast(v ? '已开启自启' : '已关闭自启'));
            }}
          />
        </div>

        {/* 全局热键 */}
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div className="shrink-0">
            <div className="text-[13.5px] text-zinc-200">全局热键</div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">切换悬浮小窗显隐，保存后重启生效</div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Input
              className="h-8 w-40 text-[12.5px]"
              value={hotkey}
              onChange={(e) => setHotkey(e.target.value)}
              placeholder="Ctrl+Alt+D"
            />
            <Button
              size="sm"
              variant="subtle"
              onClick={() => {
                setConfig.mutate({ key: 'hotkey', value: hotkey.trim() || 'Ctrl+Alt+D' });
                toast('热键已保存，重启应用后生效');
              }}
            >
              保存
            </Button>
          </div>
        </div>

        {/* 透明度 */}
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div className="shrink-0">
            <div className="text-[13.5px] text-zinc-200">小窗底色浓度</div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">数值越低越透，实时生效</div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <input
              type="range"
              min={55}
              max={95}
              value={opacity}
              className="w-40 accent-[var(--accent)]"
              onChange={(e) => setOpacity(Number(e.target.value))}
              onPointerUp={() => setConfig.mutate({ key: 'widget_opacity', value: String(opacity) })}
              onKeyUp={() => setConfig.mutate({ key: 'widget_opacity', value: String(opacity) })}
            />
            <span className="w-9 text-right text-[12px] tabular-nums text-zinc-400">{opacity}</span>
          </div>
        </div>

        {/* 强调色 */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-[13.5px] text-zinc-200">强调色</div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">应用于勾选框、进度与高亮</div>
          </div>
          <div className="flex gap-2">
            {Object.entries(ACCENTS).map(([key, hex]) => (
              <button
                key={key}
                type="button"
                aria-label={key}
                onClick={() => setConfig.mutate({ key: 'accent', value: key })}
                className={cn(
                  'h-6 w-6 rounded-full transition-transform',
                  accent === key && 'scale-110 ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-950',
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>

        {/* 数据 */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <div className="text-[13.5px] text-zinc-200">数据备份</div>
            <div className="mt-0.5 text-[11.5px] text-zinc-500">
              导出/导入全量 JSON；应用每天启动时也会自动备份（保留 7 份）
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="subtle"
              onClick={async () => {
                const path = await save({
                  defaultPath: `desklist-backup-${todayStr()}.json`,
                  filters: [{ name: 'JSON', extensions: ['json'] }],
                });
                if (path) {
                  await api.exportData(path);
                  toast('已导出');
                }
              }}
            >
              导出
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={async () => {
                const path = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
                if (path) {
                  try {
                    await api.importData(path);
                    toast('导入完成');
                  } catch (e) {
                    toast(`导入失败：${e}`);
                  }
                }
              }}
            >
              导入
            </Button>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-zinc-600">DeskList v0.1.0 · 数据存放于 %APPDATA%/com.desklist.app</p>
    </div>
  );
}
