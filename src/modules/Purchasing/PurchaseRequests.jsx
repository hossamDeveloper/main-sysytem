import { useState } from 'react';
import {
  usePurchaseRequests,
  useCreatePurchaseRequest,
  useUpdatePurchaseRequest,
  useDeletePurchaseRequest,
} from '../../services/purchasingQueries';
import { useSuppliers } from '../../services/purchasingQueries';
import { useAppSelector } from '../../store/hooks';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function PurchaseRequests() {
  const permissions = useModulePermissions('purchasing');
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading } = usePurchaseRequests({ page, limit: 10, search, status: statusFilter });
  const { data: suppliersData } = useSuppliers({ limit: 1000 });
  const createMutation = useCreatePurchaseRequest();
  const updateMutation = useUpdatePurchaseRequest();
  const deleteMutation = useDeletePurchaseRequest();

  const [formData, setFormData] = useState({
    requestDate: new Date().toISOString().split('T')[0],
    requestedBy: user?.name || '',
    department: '',
    status: 'Draft',
    items: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [newItem, setNewItem] = useState({ itemName: '', quantity: '', estimatedPrice: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.requestDate) errors.requestDate = 'تاريخ الطلب مطلوب';
    if (!formData.requestedBy.trim()) errors.requestedBy = 'اسم الطالب مطلوب';
    if (!formData.department.trim()) errors.department = 'القسم مطلوب';
    if (formData.items.length === 0) errors.items = 'يجب إضافة عنصر واحد على الأقل';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      requestDate: new Date().toISOString().split('T')[0],
      requestedBy: user?.name || '',
      department: '',
      status: 'Draft',
      items: [],
    });
    setNewItem({ itemName: '', quantity: '', estimatedPrice: '' });
    setFormErrors({});
    setEditingPR(null);
  };

  const handleAddItem = () => {
    if (!newItem.itemName || !newItem.quantity || !newItem.estimatedPrice) {
      showToast('يرجى ملء جميع حقول العنصر', 'error');
      return;
    }
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: Date.now(),
          itemName: newItem.itemName,
          quantity: parseInt(newItem.quantity),
          estimatedPrice: parseFloat(newItem.estimatedPrice),
        },
      ],
    });
    setNewItem({ itemName: '', quantity: '', estimatedPrice: '' });
  };

  const handleRemoveItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item) => item.id !== itemId),
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pr) => {
    setEditingPR(pr);
    setFormData({
      requestDate: pr.requestDate || new Date().toISOString().split('T')[0],
      requestedBy: pr.requestedBy || user?.name || '',
      department: pr.department || '',
      status: pr.status || 'Draft',
      items: pr.items || [],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingPR) {
        await updateMutation.mutateAsync({
          id: editingPR.id,
          data: formData,
        });
        showToast('تم تحديث طلب الشراء بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم إنشاء طلب الشراء بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = (pr) => {
    setItemToDelete(pr);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        showToast('تم حذف طلب الشراء بنجاح');
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

  const getStatusBadge = (status) => {
    const statusMap = {
      Draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
      Submitted: { label: 'مقدم', color: 'bg-blue-100 text-blue-800' },
      Approved: { label: 'موافق عليه', color: 'bg-green-100 text-green-800' },
      Rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || statusMap.Draft;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const columns = [
    { key: 'prNumber', label: 'رقم الطلب' },
    { key: 'requestDate', label: 'تاريخ الطلب' },
    { key: 'requestedBy', label: 'الطالب' },
    { key: 'department', label: 'القسم' },
    {
      key: 'status',
      label: 'الحالة',
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'items',
      label: 'عدد العناصر',
      render: (value) => value?.length || 0,
    },
  ];

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0) * (item.quantity || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">طلبات الشراء</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + إنشاء طلب شراء جديد
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
          <option value="Draft">مسودة</option>
          <option value="Submitted">مقدم</option>
          <option value="Approved">موافق عليه</option>
          <option value="Rejected">مرفوض</option>
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
        title={editingPR ? 'تعديل طلب شراء' : 'إنشاء طلب شراء جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الطلب <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.requestDate}
                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.requestDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.requestDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.requestDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الطالب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.requestedBy ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.requestedBy && (
                <p className="mt-1 text-sm text-red-600">{formErrors.requestedBy}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                القسم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.department ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.department && (
                <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="Draft">مسودة</option>
                <option value="Submitted">مقدم</option>
                <option value="Approved">موافق عليه</option>
                <option value="Rejected">مرفوض</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العناصر <span className="text-red-500">*</span>
            </label>
            {formErrors.items && (
              <p className="mb-2 text-sm text-red-600">{formErrors.items}</p>
            )}

            {/* Add New Item */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <input
                type="text"
                placeholder="اسم العنصر"
                value={newItem.itemName}
                onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="number"
                placeholder="الكمية"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="السعر المقدر"
                value={newItem.estimatedPrice}
                onChange={(e) => setNewItem({ ...newItem, estimatedPrice: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                إضافة
              </button>
            </div>

            {/* Items List */}
            <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
              {formData.items.length === 0 ? (
                <p className="text-gray-500 text-sm text-center">لا توجد عناصر</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2">اسم العنصر</th>
                      <th className="text-right py-2">الكمية</th>
                      <th className="text-right py-2">السعر المقدر</th>
                      <th className="text-right py-2">الإجمالي</th>
                      <th className="text-right py-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">{item.itemName}</td>
                        <td className="py-2">{item.quantity}</td>
                        <td className="py-2">{item.estimatedPrice} ج.م</td>
                        <td className="py-2">
                          {(item.estimatedPrice * item.quantity).toFixed(2)} ج.م
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-2 text-right font-semibold">
              الإجمالي: {totalAmount.toFixed(2)} ج.م
            </div>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف طلب الشراء "${itemToDelete?.prNumber}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

