import { useEffect } from 'react';

export function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = type === 'success' 
    ? 'bg-emerald-500' 
    : type === 'error' 
    ? 'bg-rose-500' 
    : 'bg-sky-600';

  return (
    <div className={`fixed top-4 left-4 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-auto text-white hover:text-gray-200 font-bold"
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  );
}



