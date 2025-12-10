import { useMemo, useState } from 'react';

export function DataTable({
  data = [],
  columns = [],
  searchFields = [],
  onView,
  onPay,
  onEdit,
  onDelete,
  onPrint,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim() || searchFields.length === 0) return data;
    const term = query.toLowerCase();
    return data.filter((row) =>
      searchFields.some((field) => {
        const value = row?.[field];
        return value !== undefined && String(value).toLowerCase().includes(term);
      })
    );
  }, [data, query, searchFields]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 flex justify-between items-center gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-right text-sm font-semibold text-gray-700"
                >
                  {col.label}
                </th>
              ))}
              {(onView || onPay || onEdit || onDelete || onPrint) && (
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  الإجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filtered.map((row, idx) => (
              <tr key={row.id || row._id || idx} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const value = row[col.key];
                  const display = col.render ? col.render(value, row) : value || '-';
                  return (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                      {display}
                    </td>
                  );
                })}
                {(onView || onPay || onEdit || onDelete || onPrint) && (
                  <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                    <div className="flex gap-2 justify-start">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          عرض
                        </button>
                      )}
                      {onPay && (
                        <button
                          onClick={() => onPay(row)}
                          className="px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
                        >
                          سداد
                        </button>
                      )}
                      {onPrint && (
                        <button
                          onClick={() => onPrint(row)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                        >
                          طباعة
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
                        >
                          تعديل
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onView || onPay || onEdit || onDelete || onPrint ? 1 : 0)}
                  className="px-4 py-6 text-center text-gray-500 text-sm"
                >
                  لا توجد بيانات للعرض
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
