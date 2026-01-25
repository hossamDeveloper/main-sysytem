import { useMemo, useState } from 'react';
import {
  usePurchaseOrders,
  useSuppliers,
  useCustodies,
  useProducts,
  useSupplierProducts,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
  useDeletePurchaseOrder,
} from '../../services/purchasingQueries';
import { useAppSelector } from '../../store/hooks';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function PurchaseOrders() {
  const permissions = useModulePermissions('purchasing');
  const { user } = useAppSelector((state) => state.auth);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    custodyId: '',
    custodyNumber: '',
    responsibleEmployeeId: '',
    responsibleEmployeeName: '',
    custodyAmount: 0,
    custodyRemainingAmount: 0,
    deliveryDate: '',
    paymentTerms: '',
    status: 'Open',
    items: [],
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [newItem, setNewItem] = useState({ itemName: '', quantity: '', price: '' });
  const [itemInputMode, setItemInputMode] = useState('manual'); // 'manual' or 'product'
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data, isLoading } = usePurchaseOrders({ page, limit: 10, search, status: statusFilter });
  const { data: suppliersData } = useSuppliers({ limit: 1000 });
  const { data: openCustodiesData } = useCustodies({ limit: 1000, status: 'Issued' });
  const { data: productsData } = useProducts({ limit: 1000 });
  const { data: supplierProductsData } = useSupplierProducts(formData.supplierId || null, {
    limit: 1000,
  });
  const createMutation = useCreatePurchaseOrder();
  const updateMutation = useUpdatePurchaseOrder();
  const deleteMutation = useDeletePurchaseOrder();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.supplierId) errors.supplierId = 'المورد مطلوب';
    if (!formData.custodyId) errors.custodyId = 'العهدة مطلوبة';
    if (!formData.deliveryDate) errors.deliveryDate = 'تاريخ التسليم مطلوب';
    if (!formData.paymentTerms) errors.paymentTerms = 'شروط الدفع مطلوبة';
    if (formData.items.length === 0) errors.items = 'يجب إضافة عنصر واحد على الأقل';
    
    // Check if total amount exceeds custody remaining amount
    const orderTotal = formData.items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );
    if (formData.custodyRemainingAmount > 0 && orderTotal > formData.custodyRemainingAmount) {
      errors.items = `إجمالي الطلب (${orderTotal.toFixed(2)}) يتجاوز المتبقي في العهدة (${formData.custodyRemainingAmount.toFixed(2)})`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      custodyId: '',
      custodyNumber: '',
      responsibleEmployeeId: '',
      responsibleEmployeeName: '',
      custodyAmount: 0,
      custodyRemainingAmount: 0,
      deliveryDate: '',
      paymentTerms: '',
      status: 'Open',
      items: [],
      notes: '',
    });
    setNewItem({ itemName: '', quantity: '', price: '' });
    setItemInputMode('manual');
    setSelectedProductId('');
    setFormErrors({});
    setEditingPO(null);
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliersData?.data?.find((s) => s.id === supplierId);
    setFormData({
      ...formData,
      supplierId,
      supplierName: supplier?.name || '',
    });
    // Reset product selection when supplier changes
    if (itemInputMode === 'product') {
      setSelectedProductId('');
      setNewItem({ itemName: '', quantity: '', price: '' });
    }
  };

  // Get open custodies with remaining amount calculated
  const openCustodiesWithBalance = useMemo(() => {
    const openCustodies = openCustodiesData?.data || [];
    return openCustodies.map((c) => {
      const amount = parseFloat(c.amount) || 0;
      const spentAmount = parseFloat(c.spentAmount) || 0;
      const remainingAmount = c.remainingAmount !== undefined 
        ? parseFloat(c.remainingAmount) 
        : amount - spentAmount;
      return {
        ...c,
        remainingAmount,
      };
    }).filter((c) => c.remainingAmount > 0); // Only show custodies with remaining balance
  }, [openCustodiesData?.data]);

  const handleCustodyChange = (custodyId) => {
    const custody = openCustodiesWithBalance.find((c) => c.id === custodyId);
    if (custody) {
      setFormData({
        ...formData,
        custodyId,
        custodyNumber: custody.custodyNumber || '',
        responsibleEmployeeId: custody.employeeId || '',
        responsibleEmployeeName: custody.employeeName || '',
        custodyAmount: parseFloat(custody.amount) || 0,
        custodyRemainingAmount: custody.remainingAmount || 0,
      });
    } else {
      setFormData({
        ...formData,
        custodyId: '',
        custodyNumber: '',
        responsibleEmployeeId: '',
        responsibleEmployeeName: '',
        custodyAmount: 0,
        custodyRemainingAmount: 0,
      });
    }
  };

  const handleProductSelect = (productId) => {
    if (!productId) {
      setSelectedProductId('');
      setNewItem({ itemName: '', quantity: '', price: '' });
      return;
    }
    
    const product = productsData?.data?.find((p) => p.id === productId);
    if (!product) return;
    
    // Find supplier product price if supplier is selected
    let productPrice = '';
    if (formData.supplierId && supplierProductsData?.data) {
      const supplierProduct = supplierProductsData.data.find(
        (sp) => sp.productId === productId
      );
      if (supplierProduct) {
        productPrice = supplierProduct.price || '';
      }
    }
    
    setSelectedProductId(productId);
    setNewItem({
      itemName: product.name || '',
      quantity: '',
      price: productPrice,
    });
  };

  const handleAddItem = () => {
    if (itemInputMode === 'product') {
      // Add from product
      if (!selectedProductId || !newItem.quantity || !newItem.price) {
        showToast('يرجى ملء جميع حقول العنصر', 'error');
        return;
      }
      const product = productsData?.data?.find((p) => p.id === selectedProductId);
      setFormData({
        ...formData,
        items: [
          ...formData.items,
          {
            id: Date.now(),
            productId: selectedProductId,
            itemName: product?.name || newItem.itemName,
            quantity: parseInt(newItem.quantity),
            price: parseFloat(newItem.price),
          },
        ],
      });
      setSelectedProductId('');
      setNewItem({ itemName: '', quantity: '', price: '' });
    } else {
      // Manual input
      if (!newItem.itemName || !newItem.quantity || !newItem.price) {
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
            price: parseFloat(newItem.price),
          },
        ],
      });
      setNewItem({ itemName: '', quantity: '', price: '' });
    }
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

  const handleOpenEdit = (po) => {
    setEditingPO(po);
    setItemInputMode('manual');
    setSelectedProductId('');
    setNewItem({ itemName: '', quantity: '', price: '' });
    // Find custody to get current remaining amount
    const custody = openCustodiesWithBalance.find((c) => c.id === po.custodyId);
    setFormData({
      supplierId: po.supplierId || '',
      supplierName: po.supplierName || '',
      custodyId: po.custodyId || '',
      custodyNumber: po.custodyNumber || '',
      responsibleEmployeeId: po.responsibleEmployeeId || '',
      responsibleEmployeeName: po.responsibleEmployeeName || '',
      custodyAmount: parseFloat(po.custodyAmount) || custody?.amount || 0,
      custodyRemainingAmount: custody?.remainingAmount ?? parseFloat(po.custodyRemainingAmount) ?? 0,
      deliveryDate: po.deliveryDate || '',
      paymentTerms: po.paymentTerms || '',
      status: po.status || 'Open',
      items: po.items || [],
      notes: po.notes || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleView = (po) => {
    setViewingPO(po);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingPO) {
        await updateMutation.mutateAsync({
          id: editingPO.id,
          data: formData,
        });
        showToast('تم تحديث أمر الشراء بنجاح');
      } else {
        await createMutation.mutateAsync(formData);
        showToast('تم إنشاء أمر الشراء بنجاح');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  const handleDelete = (po) => {
    setItemToDelete(po);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        showToast('تم حذف أمر الشراء بنجاح');
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
      Open: { label: 'مفتوح', color: 'bg-blue-100 text-blue-800' },
      'Partially Received': { label: 'مستلم جزئياً', color: 'bg-yellow-100 text-yellow-800' },
      Completed: { label: 'مكتمل', color: 'bg-green-100 text-green-800' },
      Cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status] || statusMap.Open;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const columns = [
    { key: 'poNumber', label: 'رقم الأمر' },
    { key: 'supplierName', label: 'المورد' },
    {
      key: 'totalAmount',
      label: 'الإجمالي',
      render: (value) => `${parseFloat(value || 0).toFixed(2)} ج.م`,
    },
    { key: 'deliveryDate', label: 'تاريخ التسليم' },
    {
      key: 'status',
      label: 'الحالة',
      render: (value) => getStatusBadge(value),
    },
  ];

  const totalAmount = formData.items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">أوامر الشراء</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + إنشاء أمر شراء جديد
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
          <option value="Open">مفتوح</option>
          <option value="Partially Received">مستلم جزئياً</option>
          <option value="Completed">مكتمل</option>
          <option value="Cancelled">ملغي</option>
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
        title={editingPO ? 'تعديل أمر شراء' : 'إنشاء أمر شراء جديد'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                المورد <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.supplierId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">اختر مورد</option>
                {(suppliersData?.data || [])
                  .filter((s) => s.status === 'Active')
                  .map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
              </select>
              {formErrors.supplierId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.supplierId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العهدة <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.custodyId}
                onChange={(e) => handleCustodyChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.custodyId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">اختر عهدة</option>
                {openCustodiesWithBalance.map((custody) => (
                  <option key={custody.id} value={custody.id}>
                    {custody.custodyNumber} — {custody.employeeName} — المتبقي:{' '}
                    {custody.remainingAmount.toFixed(2)} ج.م
                  </option>
                ))}
              </select>
              {formErrors.custodyId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.custodyId}</p>
              )}
              {formData.custodyId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">الموظف:</span> {formData.responsibleEmployeeName}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">إجمالي العهدة:</span>{' '}
                    {formData.custodyAmount.toFixed(2)} ج.م
                  </p>
                  <p className="text-green-700 font-medium">
                    <span className="font-medium">المتبقي:</span>{' '}
                    {formData.custodyRemainingAmount.toFixed(2)} ج.م
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ التسليم <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.deliveryDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.deliveryDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.deliveryDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                شروط الدفع <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="مثال: 30 يوم، نقدي، شيك..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.paymentTerms ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.paymentTerms && (
                <p className="mt-1 text-sm text-red-600">{formErrors.paymentTerms}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
              >
                <option value="Open">مفتوح</option>
                <option value="Partially Received">مستلم جزئياً</option>
                <option value="Completed">مكتمل</option>
                <option value="Cancelled">ملغي</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                العناصر <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setItemInputMode('manual');
                    setSelectedProductId('');
                    setNewItem({ itemName: '', quantity: '', price: '' });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    itemInputMode === 'manual'
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  إدخال يدوي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemInputMode('product');
                    setSelectedProductId('');
                    setNewItem({ itemName: '', quantity: '', price: '' });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    itemInputMode === 'product'
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  من المنتجات
                </button>
              </div>
            </div>
            {formErrors.items && (
              <p className="mb-2 text-sm text-red-600">{formErrors.items}</p>
            )}

            {/* Add New Item */}
            {itemInputMode === 'product' ? (
              <div className="space-y-2 mb-3">
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  disabled={!formData.supplierId}
                >
                  <option value="">اختر منتج</option>
                  {(productsData?.data || []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.category ? `(${product.category})` : ''}
                    </option>
                  ))}
                </select>
                {!formData.supplierId && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    يرجى اختيار مورد أولاً لعرض أسعار المنتجات
                  </div>
                )}
                {formData.supplierId && selectedProductId && (
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="اسم المنتج"
                      value={newItem.itemName}
                      disabled
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
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
                      placeholder="السعر"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
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
                )}
              </div>
            ) : (
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
                  placeholder="السعر"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
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
            )}

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
                      <th className="text-right py-2">السعر</th>
                      <th className="text-right py-2">الإجمالي</th>
                      <th className="text-right py-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">{item.itemName}</td>
                        <td className="py-2">{item.quantity}</td>
                        <td className="py-2">{item.price} ج.م</td>
                        <td className="py-2">
                          {((item.price || 0) * (item.quantity || 0)).toFixed(2)} ج.م
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
      {viewingPO && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingPO(null);
          }}
          title={`تفاصيل أمر الشراء: ${viewingPO.poNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">المورد</label>
                <p className="text-gray-800">{viewingPO.supplierName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">العهدة</label>
                <p className="text-gray-800">
                  {viewingPO.custodyNumber || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">الموظف المسؤول</label>
                <p className="text-gray-800">
                  {viewingPO.responsibleEmployeeName || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ التسليم</label>
                <p className="text-gray-800">{viewingPO.deliveryDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">شروط الدفع</label>
                <p className="text-gray-800">{viewingPO.paymentTerms}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">الحالة</label>
                <p>{getStatusBadge(viewingPO.status)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2">العناصر</label>
              <table className="w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">اسم العنصر</th>
                    <th className="px-3 py-2 text-right">الكمية</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPO.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t">
                      <td className="px-3 py-2">{item.itemName}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{item.price} ج.م</td>
                      <td className="px-3 py-2">
                        {((item.price || 0) * (item.quantity || 0)).toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-right font-semibold">
                الإجمالي: {parseFloat(viewingPO.totalAmount || 0).toFixed(2)} ج.م
              </div>
            </div>

            {viewingPO.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">ملاحظات</label>
                <p className="text-gray-800">{viewingPO.notes}</p>
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
        message={`هل أنت متأكد من حذف أمر الشراء "${itemToDelete?.poNumber}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

