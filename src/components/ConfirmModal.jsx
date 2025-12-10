import { Modal } from './Modal';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  danger = false,
}) {
  if (!isOpen) return null;

  const confirmClasses = danger
    ? 'bg-rose-600 hover:bg-rose-700'
    : 'bg-sky-600 hover:bg-sky-700';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" zIndexClass="z-[10000]">
      <div className="space-y-6">
        <p className="text-gray-700 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${confirmClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

