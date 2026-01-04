export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  zIndexClass = 'z-[9990]',
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    large: 'max-w-6xl',
  };

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black bg-opacity-50`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 id="modal-title" className="text-xl font-bold text-gray-800">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}



