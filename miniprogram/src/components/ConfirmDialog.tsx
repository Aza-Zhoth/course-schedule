import { Text, View } from '@tarojs/components';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 通用二次确认弹窗 —— 一切不可撤销的操作都必须先过这里 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // 迁移说明：H5 版在这里监听 window 的 keydown 事件实现 Esc 关窗。
  // 小程序没有物理键盘、也没有 window 对象，这段逻辑整块删掉了。

  if (!open) return null;

  return (
    /* 迁移说明：H5 版靠 event.target === event.currentTarget 判断「点的是遮罩本身」。
       小程序的事件对象里 target / currentTarget 是两个不同引用，这个判断永远为假 ——
       点遮罩不会关窗。改成和其余弹窗一致的独立遮罩层承接点击。 */
    <View className="modal modal--center">
      <View className="modal__mask" onClick={onCancel} />
      <View className="modal__sheet modal__sheet--card" aria-modal="true" aria-label={title}>
        <View className="confirm">
          <Text className="confirm__title">{title}</Text>
          <Text className="confirm__message">{message}</Text>
        </View>

        <View className="modal__foot" style={{ paddingBottom: 11 }}>
          <View className="btn btn--secondary" onClick={onCancel}>
            <Text>取消</Text>
          </View>
          <View className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            <Text>{confirmText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
