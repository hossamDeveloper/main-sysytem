import { useState } from 'react';
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useSupplierProducts,
  useProducts,
  useCreateSupplierProduct,
  useUpdateSupplierProduct,
  useDeleteSupplierProduct,
} from '../../services/purchasingQueries';
import { exportToExcel, importFromExcel } from '../../utils/excelUtils';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';
import { purchasingApi } from '../../services/purchasingApi';

export function Suppliers() {
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // Products management
  const { data: productsData } = useProducts({ limit: 1000 });
  const { data: supplierProductsData, isLoading: loadingProducts } = useSupplierProducts(
    selectedSupplier?.id,
    { limit: 1000 }
  );
  const createProductMutation = useCreateSupplierProduct();
  const updateProductMutation = useUpdateSupplierProduct();
  const deleteProductMutation = useDeleteSupplierProduct();

  const [productFormData, setProductFormData] = useState({
    productId: '',
    price: '',
  });

  const [productFormErrors, setProductFormErrors] = useState({});

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

  // Products management functions
  const handleOpenProducts = (supplier) => {
    setSelectedSupplier(supplier);
    setIsProductsModalOpen(true);
    setEditingProduct(null);
    setProductFormData({ productId: '', price: '' });
    setProductFormErrors({});
  };

  const handleOpenEditProduct = (supplierProduct) => {
    setEditingProduct(supplierProduct);
    setProductFormData({
      productId: supplierProduct.productId,
      price: supplierProduct.price,
    });
    setProductFormErrors({});
  };

  const validateProductForm = () => {
    const errors = {};
    if (!productFormData.productId) errors.productId = 'المنتج مطلوب';
    if (!productFormData.price || parseFloat(productFormData.price) <= 0) {
      errors.price = 'السعر مطلوب ويجب أن يكون أكبر من صفر';
    }
    setProductFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id,
          data: {
            productId: productFormData.productId,
            price: productFormData.price,
          },
        });
        showToast('تم تحديث المنتج بنجاح');
      } else {
        await createProductMutation.mutateAsync({
          supplierId: selectedSupplier.id,
          productId: productFormData.productId,
          price: productFormData.price,
        });
        showToast('تم إضافة المنتج بنجاح');
      }
      setEditingProduct(null);
      setProductFormData({ productId: '', price: '' });
      setProductFormErrors({});
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDeleteProduct = (supplierProduct) => {
    setProductToDelete(supplierProduct);
    setIsDeleteProductModalOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      try {
        await deleteProductMutation.mutateAsync(productToDelete.id);
        showToast('تم حذف المنتج بنجاح');
        setProductToDelete(null);
        setIsDeleteProductModalOpen(false);
      } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleExport = async () => {
    try {
      const res = await purchasingApi.getSuppliers({ page: 1, limit: 100000 });
      const allSuppliers = res?.data || [];
      if (!allSuppliers.length) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
      }

      const supplierProductsRaw = localStorage.getItem('purchasing_supplierProducts');
      const productsRaw = localStorage.getItem('purchasing_products');
      const supplierProducts = supplierProductsRaw ? JSON.parse(supplierProductsRaw) : [];
      const products = productsRaw ? JSON.parse(productsRaw) : [];

      const rows = [];
      allSuppliers.forEach((s) => {
        const spList = supplierProducts.filter((sp) => sp.supplierId === s.id);
        if (!spList.length) {
          rows.push({
            supplierId: s.id,
            name: s.name,
            contactPerson: s.contactPerson,
            phone: s.phone,
            email: s.email,
            address: s.address,
            status: s.status,
            productId: '',
            productName: '',
            productCategory: '',
            productPrice: '',
          });
        } else {
          spList.forEach((sp) => {
            const product = products.find((p) => p.id === sp.productId);
            rows.push({
              supplierId: s.id,
              name: s.name,
              contactPerson: s.contactPerson,
              phone: s.phone,
              email: s.email,
              address: s.address,
              status: s.status,
              productId: sp.productId,
              productName: product?.name || '',
              productCategory: product?.category || '',
              productPrice: sp.price,
            });
          });
        }
      });

      exportToExcel(rows, 'suppliers', 'erp_export_suppliers_with_products.xlsx');
      showToast('تم تصدير الموردين مع منتجاتهم إلى Excel بنجاح');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء التصدير', 'error');
    }
  };

  const handleImport = (importedRows) => {
    if (!Array.isArray(importedRows) || !importedRows.length) {
      showToast('ملف الاستيراد فارغ أو غير صحيح', 'error');
      return;
    }

    // مسح كل البيانات القديمة من LocalStorage
    localStorage.removeItem('purchasing_suppliers');
    localStorage.removeItem('purchasing_supplierProducts');
    localStorage.removeItem('purchasing_products');

    const suppliersMap = new Map();
    const productsMap = new Map();
    const supplierProducts = [];

    importedRows.forEach((row, index) => {
      const supplierName = row.name || row['name'] || row['اسم المورد'] || '';
      if (!supplierName) return;

      const supplierKey = supplierName.trim();
      if (!suppliersMap.has(supplierKey)) {
        suppliersMap.set(supplierKey, {
          id: `SUP-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          name: supplierName,
          contactPerson: row.contactPerson || row['الشخص المسؤول'] || '',
          phone: row.phone || row['الهاتف'] || '',
          email: row.email || row['البريد الإلكتروني'] || '',
          address: row.address || row['العنوان'] || '',
          status: row.status || row['الحالة'] || 'Active',
          createdAt: new Date().toISOString(),
        });
      }

      const productName = row.productName || row['productName'] || row['اسم المنتج'] || '';
      const productCategory = row.productCategory || row['productCategory'] || row['الفئة'] || '';
      const productPrice = row.productPrice || row['productPrice'] || row['سعر المنتج'] || row['السعر'] || '';

      if (productName) {
        const productKey = `${productName.trim()}__${productCategory.trim()}`;
        if (!productsMap.has(productKey)) {
          productsMap.set(productKey, {
            id: `PROD-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: productName,
            category: productCategory,
            createdAt: new Date().toISOString(),
          });
        }

        const supplier = suppliersMap.get(supplierKey);
        const product = productsMap.get(productKey);
        supplierProducts.push({
          id: `SUPPROD-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          supplierId: supplier.id,
          productId: product.id,
          price: parseFloat(productPrice) || 0,
          createdAt: new Date().toISOString(),
        });
      }
    });

    const suppliersArr = Array.from(suppliersMap.values());
    const productsArr = Array.from(productsMap.values());

    localStorage.setItem('purchasing_suppliers', JSON.stringify(suppliersArr));
    localStorage.setItem('purchasing_products', JSON.stringify(productsArr));
    localStorage.setItem('purchasing_supplierProducts', JSON.stringify(supplierProducts));

    showToast('تم استبدال بيانات الموردين ومنتجاتهم من ملف Excel بنجاح (تم مسح القديم بالكامل)', 'success');
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
        <div className="flex gap-3">
          {permissions.view && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              تصدير Excel
            </button>
          )}
          {permissions.create && (
            <>
              <ImportSuppliersButton onImport={handleImport} />
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                + إضافة مورد جديد
              </button>
            </>
          )}
        </div>
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
                            <>
                              <button
                                onClick={() => handleOpenEdit(row)}
                                className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleOpenProducts(row)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                              >
                                منتجات
                              </button>
                            </>
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

      {/* Products Management Modal */}
      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => {
          setIsProductsModalOpen(false);
          setSelectedSupplier(null);
          setEditingProduct(null);
          setProductFormData({ productId: '', price: '' });
        }}
        title={`إدارة منتجات المورد: ${selectedSupplier?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Add/Edit Product Form */}
          <form onSubmit={handleProductSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المنتج <span className="text-red-500">*</span>
                </label>
                <select
                  value={productFormData.productId}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, productId: e.target.value })
                  }
                  disabled={!!editingProduct}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    productFormErrors.productId ? 'border-red-500' : 'border-gray-300'
                  } ${editingProduct ? 'bg-gray-100' : ''}`}
                >
                  <option value="">اختر منتج</option>
                  {productsData?.data
                    ?.filter(
                      (p) =>
                        !editingProduct ||
                        p.id === editingProduct.productId ||
                        !supplierProductsData?.data?.some((sp) => sp.productId === p.id)
                    )
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {product.category}
                      </option>
                    ))}
                </select>
                {productFormErrors.productId && (
                  <p className="mt-1 text-sm text-red-600">{productFormErrors.productId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={productFormData.price}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, price: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                    productFormErrors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {productFormErrors.price && (
                  <p className="mt-1 text-sm text-red-600">{productFormErrors.price}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {createProductMutation.isPending || updateProductMutation.isPending
                  ? 'جاري الحفظ...'
                  : editingProduct
                  ? 'تحديث'
                  : 'إضافة'}
              </button>
              {editingProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductFormData({ productId: '', price: '' });
                    setProductFormErrors({});
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>

          {/* Products List */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">منتجات المورد</h3>
            {loadingProducts ? (
              <p className="text-center text-gray-500 py-4">جاري التحميل...</p>
            ) : supplierProductsData?.data?.length === 0 ? (
              <p className="text-center text-gray-500 py-4">لا توجد منتجات</p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        اسم المنتج
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الفئة
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        السعر
                      </th>
                      {permissions.edit && (
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                          الإجراءات
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {supplierProductsData?.data?.map((sp) => {
                      const product = productsData?.data?.find((p) => p.id === sp.productId);
                      return (
                        <tr key={sp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {product?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {product?.category || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                            {parseFloat(sp.price || 0).toFixed(2)} ج.م
                          </td>
                          {permissions.edit && (
                            <td className="px-4 py-3 text-sm text-gray-800">
                              <div className="flex gap-2 justify-start">
                                <button
                                  onClick={() => handleOpenEditProduct(sp)}
                                  className="px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-xs"
                                >
                                  تعديل
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(sp)}
                                  className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs"
                                >
                                  حذف
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Product Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteProductModalOpen}
        onClose={() => setIsDeleteProductModalOpen(false)}
        onConfirm={confirmDeleteProduct}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف هذا المنتج من المورد؟`}
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

function ImportSuppliersButton({ onImport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDoImport = () => {
    if (!file) return;
    importFromExcel(
      file,
      (rows) => {
        onImport?.(rows);
        setIsOpen(false);
        setFile(null);
      },
      (error) => {
        console.error('Import error:', error);
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
      >
        استيراد Excel
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setFile(null);
        }}
        title="استيراد Excel"
        size="sm"
      >
        <div className="space-y-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setFile(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDoImport}
              disabled={!file}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              استيراد
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

