import { useState, useMemo } from 'react';
import {
  useCustodies,
  useCreateCustody,
  useUpdateCustody,
  useCloseCustody,
} from '../../services/purchasingQueries';
import { useERPStorage } from '../../hooks/useERPStorage';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function Custodies() {
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [editingCustody, setEditingCustody] = useState(null);
  const [custodyToClose, setCustodyToClose] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading } = useCustodies({ page, limit: 10, search, status: statusFilter });
  const { data: employees } = useERPStorage('employees');
  const createMutation = useCreateCustody();
  const updateMutation = useUpdateCustody();
  const closeMutation = useCloseCustody();

  const [formData, setFormData] = useState({
    title: '',
    employeeId: '',
    employeeName: '',
    amount: '',
    issueDate: new Date().toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان العهدة مطلوب';
    if (!formData.employeeId) errors.employeeId = 'الموظف مطلوب';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'المبلغ مطلوب ويجب أن يكون أكبر من صفر';
    }
    if (!formData.issueDate) errors.issueDate = 'تاريخ الصرف مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      employeeId: '',
      employeeName: '',
      amount: '',
      issueDate: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setEditingCustody(null);
  };

  const handleEmployeeChange = (employeeId) => {
    const employee = employees.find((e) => e.id === employeeId);
    setFormData({
      ...formData,
      employeeId,
      employeeName: employee?.name || '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (custody) => {
    setEditingCustody(custody);
    setFormData({
      title: custody.title || '',
      employeeId: custody.employeeId || '',
      employeeName: custody.employeeName || '',
      amount: custody.amount || '',
      issueDate: custody.issueDate || new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingCustody) {
        await updateMutation.mutateAsync({
          id: editingCustody.id,
          data: formData,
        });
        showToast('تم تحديث العهدة بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم صرف العهدة بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleClose = (custody) => {
    setCustodyToClose(custody);
    setIsCloseModalOpen(true);
  };

  const confirmClose = async () => {
    if (custodyToClose) {
      try {
        await closeMutation.mutateAsync(custodyToClose.id);
        showToast('تم إغلاق العهدة بنجاح');
        setCustodyToClose(null);
        setIsCloseModalOpen(false);
      } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء الإغلاق', 'error');
      }
    }
  };

  // Calculate employee statistics
  const employeeStats = useMemo(() => {
    const stats = {};
    data?.data?.forEach((custody) => {
      if (!stats[custody.employeeId]) {
        stats[custody.employeeId] = {
          employeeName: custody.employeeName,
          totalAmount: 0,
          openAmount: 0,
          count: 0,
          openCount: 0,
        };
      }
      stats[custody.employeeId].totalAmount += parseFloat(custody.amount) || 0;
      stats[custody.employeeId].count += 1;
      if (custody.status === 'Issued') {
        stats[custody.employeeId].openAmount += parseFloat(custody.amount) || 0;
        stats[custody.employeeId].openCount += 1;
      }
    });
    return stats;
  }, [data?.data]);

  if (!permissions.view) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
        ليس لديك صلاحية لعرض هذه الصفحة
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      Issued: { label: 'مصروفة', color: 'bg-blue-100 text-blue-800' },
      Closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-800' },
    };
    const statusInfo = statusMap[status] || statusMap.Issued;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const columns = [
    { key: 'custodyNumber', label: 'رقم العهدة' },
    { key: 'title', label: 'العنوان' },
    {
      key: 'employeeName',
      label: 'الموظف',
      render: (value, row) => {
        // Try to get employee name from stored data first
        if (value) return value;
        // If not found, search in employees list
        if (row.employeeId && employees) {
          const employee = employees.find((e) => e.id === row.employeeId);
          return employee?.name || row.employeeId || '-';
        }
        return row.employeeId || '-';
      },
    },
    {
      key: 'amount',
      label: 'إجمالي المبلغ',
      render: (value) => `${parseFloat(value || 0).toFixed(2)} ج.م`,
    },
    {
      key: 'spentAmount',
      label: 'المصروف',
      render: (value, row) => {
        const spent = parseFloat(value) || 0;
        return (
          <span className={spent > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
            {spent.toFixed(2)} ج.م
          </span>
        );
      },
    },
    {
      key: 'remainingAmount',
      label: 'المتبقي',
      render: (value, row) => {
        const amount = parseFloat(row.amount) || 0;
        const spent = parseFloat(row.spentAmount) || 0;
        const remaining = value !== undefined ? parseFloat(value) : amount - spent;
        return (
          <span className={remaining > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}>
            {remaining.toFixed(2)} ج.م
          </span>
        );
      },
    },
    { key: 'issueDate', label: 'تاريخ الصرف' },
    {
      key: 'status',
      label: 'الحالة',
      render: (value) => getStatusBadge(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">صرف العهدة النقدية</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + صرف عهدة جديدة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">جميع الحالات</option>
          <option value="Issued">مصروفة</option>
          <option value="Closed">مغلقة</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
                {(permissions.edit || permissions.delete) && (
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    الإجراءات
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (permissions.edit || permissions.delete ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (permissions.edit || permissions.delete ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    لا توجد بيانات للعرض
                  </td>
                </tr>
              ) : (
                data?.data?.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => {
                      const value = row[col.key];
                      const display = col.render ? col.render(value, row) : value || '-';
                      return (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap"
                        >
                          {display}
                        </td>
                      );
                    })}
                    {(permissions.edit || permissions.delete) && (
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        <div className="flex gap-2 justify-start">
                          {permissions.edit && row.status === 'Issued' && (
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
                            >
                              تعديل
                            </button>
                          )}
                          {row.status === 'Issued' && (
                            <button
                              onClick={() => handleClose(row)}
                              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                            >
                              إغلاق
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              عرض {((page - 1) * 10) + 1} - {Math.min(page * 10, data.total)} من {data.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                السابق
              </button>
              <span className="px-3 py-1 text-sm">
                صفحة {page} من {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingCustody ? 'تعديل عهدة' : 'صرف عهدة جديدة'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان العهدة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الموظف <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                formErrors.employeeId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">اختر موظف</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
            {formErrors.employeeId && (
              <p className="mt-1 text-sm text-red-600">{formErrors.employeeId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المبلغ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.amount && (
                <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الصرف <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.issueDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.issueDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.issueDate}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'جاري الحفظ...'
                : 'حفظ'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Confirmation Modal */}
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={confirmClose}
        title="تأكيد الإغلاق"
        message={`هل أنت متأكد من إغلاق العهدة "${custodyToClose?.custodyNumber}"؟`}
        confirmText="إغلاق"
        cancelText="إلغاء"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
