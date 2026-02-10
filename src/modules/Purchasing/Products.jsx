import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useProductSuppliers,
} from '../../services/purchasingQueries';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';
import { exportToExcel, importFromExcel } from '../../utils/excelUtils';
import { purchasingApi } from '../../services/purchasingApi';

export function Products() {
  const queryClient = useQueryClient();
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuppliersModalOpen, setIsSuppliersModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  // Get suppliers for selected product
  const { data: productSuppliersData, isLoading: loadingSuppliers } = useProductSuppliers(
    selectedProduct?.id
  );

  const { data, isLoading } = useProducts({ page, limit: 10, search, category: categoryFilter });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'اسم المنتج مطلوب';
    if (!formData.category.trim()) errors.category = 'الفئة مطلوبة';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ name: '', category: '' });
    setFormErrors({});
    setEditingProduct(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          data: formData,
        });
        showToast('تم تحديث المنتج بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم إضافة المنتج بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = (product) => {
    setItemToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        showToast('تم حذف المنتج بنجاح');
        setItemToDelete(null);
        setIsDeleteModalOpen(false);
      } catch (error) {
        showToast(error.message || 'حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleViewSuppliers = (product) => {
    setSelectedProduct(product);
    setIsSuppliersModalOpen(true);
  };

  const handleExport = async () => {
    try {
      const res = await purchasingApi.getProducts({ page: 1, limit: 100000 });
      const allProducts = res?.data || [];
      if (!allProducts.length) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
      }

      const supplierProductsRaw = localStorage.getItem('purchasing_supplierProducts');
      const suppliersRaw = localStorage.getItem('purchasing_suppliers');
      const supplierProducts = supplierProductsRaw ? JSON.parse(supplierProductsRaw) : [];
      const suppliers = suppliersRaw ? JSON.parse(suppliersRaw) : [];

      const rows = [];
      allProducts.forEach((p) => {
        const spList = supplierProducts.filter((sp) => sp.productId === p.id);
        if (!spList.length) {
          rows.push({
            productId: p.id,
            productName: p.name,
            productCategory: p.category,
            supplierId: '',
            supplierName: '',
            supplierPrice: '',
          });
        } else {
          spList.forEach((sp) => {
            const supplier = suppliers.find((s) => s.id === sp.supplierId);
            rows.push({
              productId: p.id,
              productName: p.name,
              productCategory: p.category,
              supplierId: sp.supplierId,
              supplierName: supplier?.name || '',
              supplierPrice: sp.price,
            });
          });
        }
      });

      exportToExcel(rows, 'products', 'erp_export_products_with_suppliers.xlsx');
      showToast('تم تصدير المنتجات مع الموردين إلى Excel بنجاح');
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

    // مسح كل البيانات القديمة
    localStorage.removeItem('purchasing_products');
    localStorage.removeItem('purchasing_supplierProducts');
    localStorage.removeItem('purchasing_suppliers');

    const productsMap = new Map();
    const suppliersMap = new Map();
    const supplierProducts = [];

    importedRows.forEach((row, index) => {
      const productName = row.productName || row['productName'] || row['اسم المنتج'] || row['name'] || '';
      if (!productName) return;

      const productCategory =
        row.productCategory || row['productCategory'] || row['الفئة'] || row['category'] || '';
      const productKey = `${productName.trim()}__${productCategory.trim()}`;

      if (!productsMap.has(productKey)) {
        productsMap.set(productKey, {
          id: `PROD-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          name: productName,
          category: productCategory,
          createdAt: new Date().toISOString(),
        });
      }

      const supplierName =
        row.supplierName || row['supplierName'] || row['اسم المورد'] || row['supplier'] || '';
      const supplierPrice =
        row.supplierPrice || row['supplierPrice'] || row['سعر المورد'] || row['السعر'] || '';

      if (supplierName) {
        const supplierKey = supplierName.trim();
        if (!suppliersMap.has(supplierKey)) {
          suppliersMap.set(supplierKey, {
            id: `SUP-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
            name: supplierName,
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            status: 'Active',
            createdAt: new Date().toISOString(),
          });
        }

        const product = productsMap.get(productKey);
        const supplier = suppliersMap.get(supplierKey);
        supplierProducts.push({
          id: `SUPPROD-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          supplierId: supplier.id,
          productId: product.id,
          price: parseFloat(supplierPrice) || 0,
          createdAt: new Date().toISOString(),
        });
      }
    });

    const productsArr = Array.from(productsMap.values());
    const suppliersArr = Array.from(suppliersMap.values());

    localStorage.setItem('purchasing_products', JSON.stringify(productsArr));
    localStorage.setItem('purchasing_suppliers', JSON.stringify(suppliersArr));
    localStorage.setItem('purchasing_supplierProducts', JSON.stringify(supplierProducts));

    // Refresh related lists after replacing data in localStorage
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['supplierProducts'] });

    showToast(
      'تم استبدال بيانات المنتجات والموردين والربط بينهم بالكامل من ملف Excel بنجاح',
      'success'
    );
  };

  if (!permissions.view) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
        ليس لديك صلاحية لعرض هذه الصفحة
      </div>
    );
  }

  // Get unique categories
  const categories = [...new Set(data?.data?.map((p) => p.category).filter(Boolean) || [])];

  const columns = [
    { key: 'name', label: 'اسم المنتج' },
    { key: 'category', label: 'الفئة' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">المنتجات</h2>
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
              <ImportProductsButton onImport={handleImport} />
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                + إضافة منتج جديد
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
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">جميع الفئات</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
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
                    colSpan={columns.length + (permissions.edit || permissions.delete || permissions.view ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (permissions.edit || permissions.delete || permissions.view ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    لا توجد بيانات للعرض
                  </td>
                </tr>
              ) : (
                data?.data?.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap"
                      >
                        {row[col.key] || '-'}
                      </td>
                    ))}
                    {(permissions.edit || permissions.delete || permissions.view) && (
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        <div className="flex gap-2 justify-start">
                          <button
                            onClick={() => handleViewSuppliers(row)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            الموردين
                          </button>
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
        title={editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المنتج <span className="text-red-500">*</span>
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
              الفئة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                formErrors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.category && (
              <p className="mt-1 text-sm text-red-600">{formErrors.category}</p>
            )}
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
        message={`هل أنت متأكد من حذف المنتج "${itemToDelete?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      {/* Suppliers Modal */}
      <Modal
        isOpen={isSuppliersModalOpen}
        onClose={() => {
          setIsSuppliersModalOpen(false);
          setSelectedProduct(null);
        }}
        title={`موردين المنتج: ${selectedProduct?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          {loadingSuppliers ? (
            <p className="text-center text-gray-500 py-4">جاري التحميل...</p>
          ) : productSuppliersData?.suppliers?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              لا يوجد موردين يبيعون هذا المنتج
            </p>
          ) : (
            <>
              {/* Price Statistics */}
              {productSuppliersData && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">أقل سعر</p>
                    <p className="text-2xl font-bold text-green-800">
                      {parseFloat(productSuppliersData.minPrice || 0).toFixed(2)} ج.م
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">متوسط السعر</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {parseFloat(productSuppliersData.avgPrice || 0).toFixed(2)} ج.م
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">أعلى سعر</p>
                    <p className="text-2xl font-bold text-red-800">
                      {parseFloat(productSuppliersData.maxPrice || 0).toFixed(2)} ج.م
                    </p>
                  </div>
                </div>
              )}

              {/* Suppliers List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        اسم المورد
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        السعر
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {productSuppliersData?.suppliers?.map((sp) => (
                      <tr key={sp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                          {sp.supplierName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                          {parseFloat(sp.price || 0).toFixed(2)} ج.م
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {parseFloat(sp.price) === parseFloat(productSuppliersData?.minPrice) && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              الأقل
                            </span>
                          )}
                          {parseFloat(sp.price) === parseFloat(productSuppliersData?.maxPrice) && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              الأعلى
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>

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

function ImportProductsButton({ onImport }) {
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
