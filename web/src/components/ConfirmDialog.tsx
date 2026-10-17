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
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal modal--center"
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div className="modal__sheet modal__sheet--card" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="confirm">
          <h3 className="confirm__title">{title}</h3>
          <p className="confirm__message">{message}</p>
        </div>

        <div className="modal__foot" style={{ paddingBottom: 11 }}>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
