import { useState } from 'react';
import {
  useInvoices,
  usePurchaseOrders,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
} from '../../services/purchasingQueries';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function Invoices() {
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading } = useInvoices({
    page,
    limit: 10,
    search,
    paymentStatus: paymentStatusFilter,
  });
  const { data: posData } = usePurchaseOrders({ limit: 1000 });
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    poId: '',
    poNumber: '',
    supplierId: '',
    supplierName: '',
    amount: '',
    paymentStatus: 'Unpaid',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.invoiceNumber.trim()) errors.invoiceNumber = 'رقم الفاتورة مطلوب';
    if (!formData.invoiceDate) errors.invoiceDate = 'تاريخ الفاتورة مطلوب';
    if (!formData.poId) errors.poId = 'أمر الشراء مطلوب';
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'المبلغ مطلوب ويجب أن يكون أكبر من صفر';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      poId: '',
      poNumber: '',
      supplierId: '',
      supplierName: '',
      amount: '',
      paymentStatus: 'Unpaid',
      notes: '',
    });
    setFormErrors({});
    setEditingInvoice(null);
  };

  const handlePOChange = (poId) => {
    const po = posData?.data?.find((p) => p.id === poId);
    if (po) {
      setFormData({
        ...formData,
        poId,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        amount: po.totalAmount || '',
      });
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
      poId: invoice.poId || '',
      poNumber: invoice.poNumber || '',
      supplierId: invoice.supplierId || '',
      supplierName: invoice.supplierName || '',
      amount: invoice.amount || '',
      paymentStatus: invoice.paymentStatus || 'Unpaid',
      notes: invoice.notes || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleView = (invoice) => {
    setViewingInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingInvoice) {
        await updateMutation.mutateAsync({
          id: editingInvoice.id,
          data: formData,
        });
        showToast('تم تحديث الفاتورة بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم إنشاء الفاتورة بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = (invoice) => {
    setItemToDelete(invoice);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        showToast('تم حذف الفاتورة بنجاح');
        setItemToDelete(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  if (!permissions.view) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
        ليس لديك صلاحية لعرض هذه الصفحة
      </div>
    );
  }

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      Unpaid: { label: 'غير مدفوع', color: 'bg-red-100 text-red-800' },
      'Partially Paid': { label: 'مدفوع جزئياً', color: 'bg-yellow-100 text-yellow-800' },
      Paid: { label: 'مدفوع', color: 'bg-green-100 text-green-800' },
    };
    const statusInfo = statusMap[status] || statusMap.Unpaid;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const columns = [
    { key: 'invoiceNumber', label: 'رقم الفاتورة' },
    { key: 'invoiceDate', label: 'تاريخ الفاتورة' },
    { key: 'poNumber', label: 'رقم أمر الشراء' },
    { key: 'supplierName', label: 'المورد' },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (value) => `${parseFloat(value || 0).toFixed(2)} ج.م`,
    },
    {
      key: 'paymentStatus',
      label: 'حالة الدفع',
      render: (value) => getPaymentStatusBadge(value),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">الفواتير</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + إضافة فاتورة جديدة
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
          value={paymentStatusFilter}
          onChange={(e) => {
            setPaymentStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">جميع الحالات</option>
          <option value="Unpaid">غير مدفوع</option>
          <option value="Partially Paid">مدفوع جزئياً</option>
          <option value="Paid">مدفوع</option>
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
                {(permissions.view || permissions.edit || permissions.delete) && (
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
                    colSpan={columns.length + (permissions.view || permissions.edit || permissions.delete ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (permissions.view || permissions.edit || permissions.delete ? 1 : 0)}
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
                    {(permissions.view || permissions.edit || permissions.delete) && (
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        <div className="flex gap-2 justify-start">
                          {permissions.view && (
                            <button
                              onClick={() => handleView(row)}
                              className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                            >
                              عرض
                            </button>
                          )}
                          {permissions.edit && (
                            <button
                              onClick={() => handleOpenEdit(row)}
                              className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
                            >
                              تعديل
                            </button>
                          )}
                          {permissions.delete && (
                            <button
                              onClick={() => handleDelete(row)}
                              className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm"
                            >
                              حذف
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
        title={editingInvoice ? 'تعديل فاتورة' : 'إضافة فاتورة جديدة'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الفاتورة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.invoiceNumber && (
                <p className="mt-1 text-sm text-red-600">{formErrors.invoiceNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الفاتورة <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.invoiceDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.invoiceDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                أمر الشراء <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.poId}
                onChange={(e) => handlePOChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.poId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">اختر أمر شراء</option>
                {posData?.data?.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} - {po.supplierName}
                  </option>
                ))}
              </select>
              {formErrors.poId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.poId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المورد
              </label>
              <input
                type="text"
                value={formData.supplierName}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-2">حالة الدفع</label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="Unpaid">غير مدفوع</option>
                <option value="Partially Paid">مدفوع جزئياً</option>
                <option value="Paid">مدفوع</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
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

      {/* View Modal */}
      {viewingInvoice && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingInvoice(null);
          }}
          title={`تفاصيل الفاتورة: ${viewingInvoice.invoiceNumber}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">رقم الفاتورة</label>
                <p className="text-gray-800">{viewingInvoice.invoiceNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ الفاتورة</label>
                <p className="text-gray-800">{viewingInvoice.invoiceDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">رقم أمر الشراء</label>
                <p className="text-gray-800">{viewingInvoice.poNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">المورد</label>
                <p className="text-gray-800">{viewingInvoice.supplierName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">المبلغ</label>
                <p className="text-gray-800 font-semibold">
                  {parseFloat(viewingInvoice.amount || 0).toFixed(2)} ج.م
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">حالة الدفع</label>
                <p>{getPaymentStatusBadge(viewingInvoice.paymentStatus)}</p>
              </div>
            </div>

            {viewingInvoice.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">ملاحظات</label>
                <p className="text-gray-800">{viewingInvoice.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف الفاتورة "${itemToDelete?.invoiceNumber}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

