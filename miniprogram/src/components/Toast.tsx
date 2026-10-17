import { Text, View } from '@tarojs/components';
import type { ToastState } from '../hooks/useSchedule';

interface ToastProps {
  toast: ToastState | null;
}

/**
 * 全局轻提示。
 * 用 key={toast.id} 强制重挂载，这样连续两次相同文案也能各播一次动画。
 */
export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <View
      key={toast.id}
      className={`toast${toast.type === 'info' ? '' : ` toast--${toast.type}`}`}
      aria-live="polite"
    >
      <Text>{toast.message}</Text></View>
  );
}
