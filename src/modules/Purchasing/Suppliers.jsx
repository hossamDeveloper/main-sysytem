import { useState } from 'react';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '../../services/purchasingQueries';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function Suppliers() {
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading } = useSuppliers({ page, limit: 10, search, status: statusFilter });
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'اسم المورد مطلوب';
    if (!formData.contactPerson.trim()) errors.contactPerson = 'اسم الشخص المسؤول مطلوب';
    if (!formData.phone.trim()) errors.phone = 'رقم الهاتف مطلوب';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Active',
    });
    setFormErrors({});
    setEditingSupplier(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status || 'Active',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingSupplier) {
        await updateMutation.mutateAsync({
          id: editingSupplier.id,
          data: formData,
        });
        showToast('تم تحديث المورد بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم إضافة المورد بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = (supplier) => {
    setItemToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        showToast('تم حذف المورد بنجاح');
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

  const columns = [
    { key: 'name', label: 'اسم المورد' },
    { key: 'contactPerson', label: 'الشخص المسؤول' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    {
      key: 'status',
      label: 'الحالة',
      render: (value) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            value === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value === 'Active' ? 'نشط' : 'غير نشط'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">إدارة الموردين</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + إضافة مورد جديد
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
          <option value="Active">نشط</option>
          <option value="Inactive">غير نشط</option>
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
        title={editingSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المورد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشخص المسؤول <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                formErrors.contactPerson ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.contactPerson && (
              <p className="mt-1 text-sm text-red-600">{formErrors.contactPerson}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الهاتف <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.phone && (
                <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
            >
              <option value="Active">نشط</option>
              <option value="Inactive">غير نشط</option>
            </select>
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف المورد "${itemToDelete?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
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

