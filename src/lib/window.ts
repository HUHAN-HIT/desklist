import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export function hideWidget() {
  void getCurrentWindow().hide();
}

/** 双击 widget 标题栏 / 展开按钮 → 显示主窗（懒显示，进程内已存在） */
export function openMain() {
  void WebviewWindow.getByLabel('main').then((m) => {
    if (m) void m.show().then(() => m.setFocus());
  });
}
