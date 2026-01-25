import { useState, useMemo } from 'react';
import {
  useGoodsReceipts,
  usePurchaseOrders,
  useCustodies,
  useCreateGoodsReceipt,
} from '../../services/purchasingQueries';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import { useModulePermissions } from '../../hooks/usePermissions';

export function GoodsReceipt() {
  const permissions = useModulePermissions('purchasing');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [viewingGRN, setViewingGRN] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, isLoading } = useGoodsReceipts({ page, limit: 10, search });
  const { data: posData } = usePurchaseOrders({ limit: 1000 });
  const { data: custodiesData } = useCustodies({ limit: 1000 });
  const createMutation = useCreateGoodsReceipt();

  const [formData, setFormData] = useState({
    poId: '',
    receivingDate: new Date().toISOString().split('T')[0],
    items: [],
    notes: '',
  });

  // Get custody info for selected PO
  const selectedCustody = useMemo(() => {
    if (!selectedPO?.custodyId || !custodiesData?.data) return null;
    return custodiesData.data.find((c) => c.id === selectedPO.custodyId);
  }, [selectedPO?.custodyId, custodiesData?.data]);

  // Calculate total amount for received items
  const totalReceivedAmount = useMemo(() => {
    if (!formData.items.length || !selectedPO?.items) return 0;
    return formData.items.reduce((sum, item) => {
      const poItem = selectedPO.items.find((pi) => pi.id === item.itemId);
      return sum + (item.receivedQuantity || 0) * (poItem?.price || 0);
    }, 0);
  }, [formData.items, selectedPO?.items]);

  // Get custody remaining amount
  const custodyRemainingAmount = useMemo(() => {
    if (!selectedCustody) return 0;
    const spent = parseFloat(selectedCustody.spentAmount) || 0;
    if (selectedCustody.remainingAmount !== undefined) {
      return parseFloat(selectedCustody.remainingAmount);
    }
    return (parseFloat(selectedCustody.amount) || 0) - spent;
  }, [selectedCustody]);

  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.poId) errors.poId = 'أمر الشراء مطلوب';
    if (!formData.receivingDate) errors.receivingDate = 'تاريخ الاستلام مطلوب';
    if (formData.items.length === 0) errors.items = 'يجب إضافة عنصر واحد على الأقل';
    
    // Check if any items have received quantity
    const hasReceivedItems = formData.items.some((item) => (item.receivedQuantity || 0) > 0);
    if (!hasReceivedItems) {
      errors.items = 'يجب إدخال كمية مستلمة لعنصر واحد على الأقل';
    }
    
    // Check custody balance if PO has custody linked
    if (selectedCustody && totalReceivedAmount > custodyRemainingAmount) {
      errors.custody = `مبلغ الاستلام (${totalReceivedAmount.toFixed(2)} ج.م) يتجاوز المتبقي في العهدة (${custodyRemainingAmount.toFixed(2)} ج.م)`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      poId: '',
      receivingDate: new Date().toISOString().split('T')[0],
      items: [],
      notes: '',
    });
    setSelectedPO(null);
    setFormErrors({});
  };

  const handlePOChange = (poId) => {
    const po = posData?.data?.find((p) => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setFormData({
        ...formData,
        poId,
        items: po.items.map((item, idx) => {
          const orderedQty = item.quantity || 0;
          const alreadyReceived = item.receivedQuantity || 0;
          const remaining = orderedQty - alreadyReceived;
          return {
            id: item.id || Date.now() + idx,
            itemId: item.id || Date.now() + idx,
            itemName: item.itemName,
            orderedQuantity: orderedQty,
            receivedQuantity: 0,
            remainingQuantity: Math.max(0, remaining),
          };
        }),
      });
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    const item = formData.items.find((i) => i.id === itemId);
    if (item) {
      // Parse the input value
      let receivedQty = 0;
      if (quantity !== '' && quantity !== null && quantity !== undefined) {
        const parsed = parseInt(String(quantity).trim(), 10);
        receivedQty = isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      
      // Ensure received quantity doesn't exceed remaining quantity
      const maxAllowed = item.remainingQuantity || item.orderedQuantity || 0;
      if (receivedQty > maxAllowed) {
        receivedQty = maxAllowed;
      }
      
      // Calculate new remaining: original remaining minus the newly entered quantity
      const newRemaining = maxAllowed - receivedQty;
      setFormData({
        ...formData,
        items: formData.items.map((i) =>
          i.id === itemId
            ? { 
                ...i, 
                receivedQuantity: receivedQty, 
                remainingQuantity: Math.max(0, newRemaining) 
              }
            : i
        ),
      });
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleView = (grn) => {
    setViewingGRN(grn);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createMutation.mutateAsync(formData);
      showToast('تم تسجيل استلام البضائع بنجاح');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      showToast(error.message || 'حدث خطأ', 'error');
    }
  };

  if (!permissions.view) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
        ليس لديك صلاحية لعرض هذه الصفحة
      </div>
    );
  }

  // Filter POs that can receive goods
  const availablePOs = useMemo(() => {
    if (!posData?.data) return [];
    return posData.data.filter((po) => 
      ['Open', 'Partially Received'].includes(po.status)
    );
  }, [posData?.data]);

  const columns = [
    { key: 'grnNumber', label: 'رقم الاستلام' },
    { key: 'poNumber', label: 'رقم أمر الشراء' },
    { key: 'receivingDate', label: 'تاريخ الاستلام' },
    {
      key: 'totalReceivedAmount',
      label: 'إجمالي المبلغ',
      render: (value) => value ? `${parseFloat(value).toFixed(2)} ج.م` : '-',
    },
    {
      key: 'custodyDeduction',
      label: 'خصم من العهدة',
      render: (value) => value ? `${value.amountDeducted.toFixed(2)} ج.م` : '-',
    },
    {
      key: 'items',
      label: 'عدد العناصر',
      render: (value) => value?.length || 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">استلام البضائع</h2>
        {permissions.create && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            + تسجيل استلام جديد
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
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
                {permissions.view && (
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
                    colSpan={columns.length + (permissions.view ? 1 : 0)}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    جاري التحميل...
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (permissions.view ? 1 : 0)}
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
                    {permissions.view && (
                      <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                        <button
                          onClick={() => handleView(row)}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          عرض
                        </button>
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

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="تسجيل استلام بضائع"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                {availablePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} - {po.supplierName} ({po.status === 'Open' ? 'مفتوح' : 'مستلم جزئياً'})
                  </option>
                ))}
              </select>
              {formErrors.poId && (
                <p className="mt-1 text-sm text-red-600">{formErrors.poId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                تاريخ الاستلام <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.receivingDate}
                onChange={(e) => setFormData({ ...formData, receivingDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                  formErrors.receivingDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.receivingDate && (
                <p className="mt-1 text-sm text-red-600">{formErrors.receivingDate}</p>
              )}
            </div>
          </div>

          {/* Custody Info */}
          {selectedPO && selectedCustody && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">معلومات العهدة المرتبطة</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">رقم العهدة:</span>{' '}
                  <span className="font-medium">{selectedCustody.custodyNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">الموظف:</span>{' '}
                  <span className="font-medium">{selectedCustody.employeeName}</span>
                </div>
                <div>
                  <span className="text-gray-600">إجمالي العهدة:</span>{' '}
                  <span className="font-medium">{parseFloat(selectedCustody.amount).toFixed(2)} ج.م</span>
                </div>
                <div>
                  <span className="text-gray-600">المتبقي في العهدة:</span>{' '}
                  <span className={`font-medium ${custodyRemainingAmount < totalReceivedAmount ? 'text-red-600' : 'text-green-600'}`}>
                    {custodyRemainingAmount.toFixed(2)} ج.م
                  </span>
                </div>
              </div>
              {formErrors.custody && (
                <p className="mt-2 text-sm text-red-600 font-medium">{formErrors.custody}</p>
              )}
            </div>
          )}

          {selectedPO && !selectedCustody && selectedPO.custodyId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ لم يتم العثور على العهدة المرتبطة بأمر الشراء
              </p>
            </div>
          )}

          {/* Items Section */}
          {selectedPO && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العناصر المستلمة <span className="text-red-500">*</span>
              </label>
              {formErrors.items && (
                <p className="mb-2 text-sm text-red-600">{formErrors.items}</p>
              )}

              <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {formData.items.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center">لا توجد عناصر</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right py-2">اسم العنصر</th>
                        <th className="text-right py-2">المطلوب</th>
                        <th className="text-right py-2">السعر</th>
                        <th className="text-right py-2">المستلم</th>
                        <th className="text-right py-2">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item) => {
                        const poItem = selectedPO.items.find((pi) => pi.id === item.itemId);
                        const itemTotal = (item.receivedQuantity || 0) * (poItem?.price || 0);
                        return (
                          <tr key={item.id} className="border-b">
                            <td className="py-2">{item.itemName}</td>
                            <td className="py-2">{item.orderedQuantity}</td>
                            <td className="py-2">{poItem?.price?.toFixed(2) || 0} ج.م</td>
                            <td className="py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.remainingQuantity || item.orderedQuantity || 0}
                                step="1"
                                value={item.receivedQuantity || 0}
                                onChange={(e) => {
                                  handleQuantityChange(item.id, e.target.value);
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                              />
                            </td>
                            <td className="py-2 font-medium">{itemTotal.toFixed(2)} ج.م</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Total Amount */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">إجمالي مبلغ الاستلام:</span>
                  <span className="text-xl font-bold text-gray-800">{totalReceivedAmount.toFixed(2)} ج.م</span>
                </div>
                {selectedCustody && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">سيتم خصمه من العهدة:</span>
                    <span className={`font-medium ${totalReceivedAmount > custodyRemainingAmount ? 'text-red-600' : 'text-green-600'}`}>
                      {totalReceivedAmount.toFixed(2)} ج.م
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
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
      {viewingGRN && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingGRN(null);
          }}
          title={`تفاصيل استلام البضائع: ${viewingGRN.grnNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">رقم أمر الشراء</label>
                <p className="text-gray-800">{viewingGRN.poNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">المورد</label>
                <p className="text-gray-800">{viewingGRN.supplierName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">تاريخ الاستلام</label>
                <p className="text-gray-800">{viewingGRN.receivingDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">إجمالي مبلغ الاستلام</label>
                <p className="text-gray-800 font-medium">
                  {viewingGRN.totalReceivedAmount 
                    ? `${parseFloat(viewingGRN.totalReceivedAmount).toFixed(2)} ج.م` 
                    : '-'}
                </p>
              </div>
            </div>

            {/* Custody Deduction Info */}
            {viewingGRN.custodyDeduction && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">تم الخصم من العهدة</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">رقم العهدة:</span>{' '}
                    <span className="font-medium">{viewingGRN.custodyDeduction.custodyNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">الموظف:</span>{' '}
                    <span className="font-medium">{viewingGRN.custodyDeduction.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">المبلغ المخصوم:</span>{' '}
                    <span className="font-medium text-red-600">
                      {viewingGRN.custodyDeduction.amountDeducted.toFixed(2)} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">المتبقي بعد الخصم:</span>{' '}
                    <span className="font-medium text-green-600">
                      {viewingGRN.custodyDeduction.remainingAfterDeduction.toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-600 mb-2">العناصر المستلمة</label>
              <table className="w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">اسم العنصر</th>
                    <th className="px-3 py-2 text-right">الكمية المستلمة</th>
                    <th className="px-3 py-2 text-right">السعر</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingGRN.items?.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{item.itemName}</td>
                      <td className="px-3 py-2">{item.receivedQuantity}</td>
                      <td className="px-3 py-2">{item.price ? `${parseFloat(item.price).toFixed(2)} ج.م` : '-'}</td>
                      <td className="px-3 py-2 font-medium">
                        {item.totalAmount ? `${parseFloat(item.totalAmount).toFixed(2)} ج.م` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewingGRN.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">ملاحظات</label>
                <p className="text-gray-800">{viewingGRN.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

