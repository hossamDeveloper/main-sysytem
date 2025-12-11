import { useEffect, useMemo, useState } from 'react';
import { useERPStorage } from '../../hooks/useERPStorage';
import { exportToExcel, importFromExcel } from '../../utils/excelUtils';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';

export function Loans() {
  const { data: loansData, addItem, updateItem, deleteItem, replaceAll } = useERPStorage('loans');
  const { data: employees } = useERPStorage('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToPay, setItemToPay] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState(() => ({
    loanId: '',
    employeeId: '',
    amount: '',
    issuedDate: '',
    repaymentType: 'أقساط شهرية',
    installments: '',
    installmentAmount: '',
    remainingAmount: '',
    notes: '',
  }));

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getNextLoanId = () => {
    const numericIds = loansData
      .map((loan) => {
        const match = String(loan.loanId || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : NaN;
      })
      .filter((n) => Number.isFinite(n));
    const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
    return String(maxId + 1);
  };

  const groupedLoans = useMemo(() => {
    const map = {};
    loansData.forEach((loan) => {
      const empId = loan.employeeId || 'unknown';
      if (!map[empId]) {
        map[empId] = {
          employeeId: empId,
          totalAmount: 0,
          totalRemaining: 0,
          loansCount: 0,
          lastIssuedDate: loan.issuedDate || '',
        };
      }
      map[empId].totalAmount += parseFloat(loan.amount || 0);
      const remainingVal =
        loan.remainingAmount ?? // احترام القيمة حتى لو كانت 0
        (loan.schedule ? loan.schedule.reduce((sum, s) => sum + (s.paid ? 0 : parseFloat(s.amount || 0)), 0) : undefined) ??
        loan.amount;
      map[empId].totalRemaining += parseFloat(remainingVal || 0);
      map[empId].loansCount += 1;
      if ((loan.issuedDate || '') > (map[empId].lastIssuedDate || '')) {
        map[empId].lastIssuedDate = loan.issuedDate || map[empId].lastIssuedDate;
      }
    });
    return Object.values(map);
  }, [loansData]);

  useEffect(() => {
    if (!viewingItem) return;
    const updatedGroup = groupedLoans.find((g) => g.employeeId === viewingItem.employeeId);
    if (updatedGroup) {
      setViewingItem(updatedGroup);
    } else {
      setIsViewModalOpen(false);
      setViewingItem(null);
    }
  }, [groupedLoans, viewingItem]);

  const calculateInstallmentAmount = (amount, installments) => {
    if (!amount || !installments || installments <= 0) return 0;
    return Math.round((parseFloat(amount) / parseFloat(installments)) * 100) / 100;
  };

  const generateSchedule = (amount, installments, issuedDate) => {
    if (!installments || installments <= 0) return [];
    
    const schedule = [];
    const installmentAmount = calculateInstallmentAmount(amount, installments);
    const startDate = new Date(issuedDate);
    
    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      dueDate.setDate(0); // Last day of the month
      
      schedule.push({
        dueDate: dueDate.toISOString().split('T')[0],
        amount: i === installments - 1 
          ? parseFloat(amount) - (installmentAmount * (installments - 1))
          : installmentAmount,
        paid: false,
      });
    }
    
    return schedule;
  };

  const resetForm = () => {
    setFormData({
      loanId: getNextLoanId(),
      employeeId: '',
      amount: '',
      issuedDate: '',
      repaymentType: 'أقساط شهرية',
      installments: '',
      installmentAmount: '',
      remainingAmount: '',
      notes: '',
    });
    setEditingItem(null);
  };

  const handleFormChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'amount' || field === 'installments' || field === 'repaymentType') {
      if (newFormData.repaymentType === 'أقساط شهرية' && newFormData.amount && newFormData.installments) {
        newFormData.installmentAmount = calculateInstallmentAmount(newFormData.amount, newFormData.installments);
        newFormData.remainingAmount = newFormData.amount;
      } else if (newFormData.repaymentType === 'يدوي') {
        newFormData.remainingAmount = newFormData.amount;
        newFormData.installmentAmount = '';
        newFormData.installments = '';
      } else if (field === 'amount') {
        newFormData.remainingAmount = newFormData.amount;
      }
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.loanId || !formData.employeeId || !formData.amount || !formData.issuedDate) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const amount = parseFloat(formData.amount);
    const schedule = formData.repaymentType === 'أقساط شهرية' && formData.installments
      ? generateSchedule(amount, parseInt(formData.installments), formData.issuedDate)
      : [];

    const loan = {
      loanId: formData.loanId,
      employeeId: formData.employeeId,
      amount: amount,
      issuedDate: formData.issuedDate,
      repaymentType: formData.repaymentType,
      installments: formData.installments ? parseInt(formData.installments) : 0,
      installmentAmount: formData.installmentAmount ? parseFloat(formData.installmentAmount) : 0,
      remainingAmount: amount,
      schedule: schedule,
      notes: formData.notes || '',
    };

    if (editingItem) {
      updateItem(editingItem.loanId, loan, 'loanId');
      showToast('تم تحديث السلفة بنجاح');
    } else {
      if (loansData.some(loan => loan.loanId === formData.loanId)) {
        showToast('معرف السلفة موجود بالفعل', 'error');
        return;
      }
      addItem(loan);
      showToast('تم إضافة السلفة بنجاح');
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      loanId: item.loanId,
      employeeId: item.employeeId,
      amount: item.amount,
      issuedDate: item.issuedDate,
      repaymentType: item.repaymentType,
      installments: item.installments || '',
      installmentAmount: item.installmentAmount || '',
      remainingAmount: item.remainingAmount || item.amount,
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete.loanId, 'loanId');
      showToast('تم حذف السلفة بنجاح');
      setItemToDelete(null);
    }
  };

  const handlePayment = (item) => {
    setItemToPay(item);
    setIsPaymentModalOpen(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const confirmPayment = (paymentAmount) => {
    if (itemToPay && paymentAmount > 0) {
      let payLeft = parseFloat(paymentAmount);
      const updatedSchedule = (itemToPay.schedule || []).map((s) => {
        if (payLeft <= 0 || s.paid) return s;
        if (payLeft >= s.amount) {
          payLeft -= s.amount;
          return { ...s, paid: true };
        }
        return s;
      });

      const newRemaining = Math.max(0, itemToPay.remainingAmount - parseFloat(paymentAmount));
      updateItem(
        itemToPay.loanId,
        { remainingAmount: newRemaining, schedule: updatedSchedule },
        'loanId'
      );
      showToast('تم تسجيل السداد بنجاح');
      setItemToPay(null);
      setIsPaymentModalOpen(false);
    }
  };

  const handleExport = () => {
    if (loansData.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'error');
      return;
    }
    const exportData = loansData.map((loan) => {
      const scheduleArr = loan.schedule || [];
      const unpaidTotal = scheduleArr.reduce(
        (sum, s) => sum + (s.paid ? 0 : parseFloat(s.amount || 0)),
        0
      );
      return {
        loanId: loan.loanId,
        employeeId: loan.employeeId,
        employeeName: getEmployeeName(loan.employeeId),
        amount: Number(loan.amount || 0),
        remainingAmount:
          loan.remainingAmount !== undefined ? Number(loan.remainingAmount) : Number(unpaidTotal),
        issuedDate: loan.issuedDate || '',
        repaymentType: loan.repaymentType || '',
        notes: loan.notes || '',
        scheduleJson: JSON.stringify(scheduleArr),
      };
    });
    exportToExcel(exportData, 'loans', 'erp_export_loans.xlsx');
    showToast('تم تصدير البيانات بنجاح');
  };

  const parseNumber = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^\d.-]+/g, '');
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const handleImport = (importedData, mode) => {
    try {
      const processedData = importedData.map((item) => {
        const rawLoanId = item.loanId ?? item['loanId'];
        const rawEmployeeId = item.employeeId ?? item['employeeId'];
        const rawAmount = item.amount ?? item['amount'];
        const rawIssuedDate = item.issuedDate ?? item['issuedDate'];

        if (!rawLoanId || !rawEmployeeId || !rawAmount || !rawIssuedDate) {
          throw new Error('ملف غير صحيح: يجب أن يحتوي على loanId, employeeId, amount, issuedDate');
        }

        const schedule = item.scheduleJson
          ? (() => {
              try {
                return JSON.parse(item.scheduleJson);
              } catch {
                return [];
              }
            })()
          : [];

        return {
          loanId: String(rawLoanId),
          employeeId: String(rawEmployeeId),
          amount: parseNumber(rawAmount),
          issuedDate: String(rawIssuedDate),
          repaymentType: item.repaymentType || item['repaymentType'] || 'يدوي',
          installments: parseInt(item.installments || item['installments'] || 0),
          installmentAmount: parseNumber(item.installmentAmount ?? item['installmentAmount'] ?? 0),
          remainingAmount: parseNumber(
            item.remainingAmount ?? item['remainingAmount'] ?? rawAmount
          ),
          schedule,
          notes: item.notes || item['notes'] || '',
        };
      });

      if (mode === 'replace') {
        replaceAll(processedData);
        showToast('تم استبدال البيانات بنجاح');
      } else if (mode === 'merge') {
        processedData.forEach((item) => {
          const existing = loansData.find((loan) => loan.loanId === item.loanId);
          if (existing) {
            updateItem(item.loanId, item, 'loanId');
          } else {
            addItem(item);
          }
        });
        showToast('تم دمج البيانات بنجاح');
      }
      setIsImportModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('خطأ في استيراد البيانات. تأكد من أن الملف يحتوي على الحقول المطلوبة.', 'error');
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee ? employee.name : employeeId;
  };

  const columns = [
    { key: 'employeeId', label: 'الموظف', render: (val) => getEmployeeName(val) },
    { key: 'loansCount', label: 'عدد السلف' },
    { key: 'totalAmount', label: 'إجمالي السلف', render: (val) => `${val} ج.م` },
    { key: 'totalRemaining', label: 'إجمالي المتبقي', render: (val) => `${val} ج.م` },
    { key: 'lastIssuedDate', label: 'آخر إصدار' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">قسم السلف</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            تصدير Excel
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            استيراد Excel
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            إصدار سلفة جديدة
          </button>
        </div>
      </div>

      <DataTable
        data={groupedLoans}
        columns={columns}
        onView={handleView}
        searchFields={['employeeId']}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? 'تعديل سلفة' : 'إصدار سلفة جديدة'}
        size="lg"
        zIndexClass="z-[10000]"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                معرف السلفة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.loanId}
                onChange={(e) => handleFormChange('loanId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                disabled={!!editingItem}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الموظف <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => handleFormChange('employeeId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">اختر موظف</option>
                {employees.map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                قيمة السلفة الإجمالية <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleFormChange('amount', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاريخ الإصدار <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.issuedDate}
                onChange={(e) => handleFormChange('issuedDate', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع السداد <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.repaymentType}
                onChange={(e) => handleFormChange('repaymentType', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="أقساط شهرية">أقساط شهرية</option>
                <option value="يدوي">يدوي</option>
              </select>
            </div>
            {formData.repaymentType === 'أقساط شهرية' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    عدد الأقساط
                  </label>
                  <input
                    type="number"
                    value={formData.installments}
                    onChange={(e) => handleFormChange('installments', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    قيمة القسط (محسوبة تلقائياً)
                  </label>
                  <input
                    type="number"
                    value={formData.installmentAmount}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                rows="3"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف السلفة "${itemToDelete?.loanId}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setItemToPay(null);
        }}
        onConfirm={confirmPayment}
        loan={itemToPay}
      />

      <ViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingItem(null);
        }}
        loanGroup={viewingItem}
        getEmployeeName={getEmployeeName}
        onPay={handlePayment}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loansData={loansData}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
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

function PaymentModal({ isOpen, onClose, onConfirm, loan }) {
  const [paymentAmount, setPaymentAmount] = useState('');

  if (!loan) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل سداد" size="sm" zIndexClass="z-[10000]">
      <div className="space-y-4">
        <div>
          <p className="text-gray-700 mb-2">
            المتبقي للسداد: <span className="font-bold">{loan.remainingAmount} ج.م</span>
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            مبلغ السداد
          </label>
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            min="0"
            max={loan.remainingAmount}
            step="0.01"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(paymentAmount)}
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
          >
            تأكيد السداد
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ViewModal({ isOpen, onClose, loanGroup, getEmployeeName, onPay, onEdit, onDelete, loansData = [] }) {
  if (!loanGroup) return null;

  const employeeLoans = loansData.filter((l) => l.employeeId === loanGroup.employeeId);

  const monthlyTotals = (loans) => {
    const totals = {};
    loans.forEach((l) => {
      const month = l.issuedDate ? l.issuedDate.slice(0, 7) : 'غير محدد';
      if (!totals[month]) {
        totals[month] = { amount: 0, count: 0 };
      }
      totals[month].amount += parseFloat(l.amount || 0);
      totals[month].count += 1;
    });
    return totals;
  };

  const totals = monthlyTotals(employeeLoans || []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="عرض سلف الموظف" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="الموظف" value={getEmployeeName(loanGroup.employeeId)} />
          <InfoRow label="عدد السلف" value={loanGroup.loansCount} />
          <InfoRow label="إجمالي السلف" value={`${loanGroup.totalAmount} ج.م`} />
          <InfoRow label="إجمالي المتبقي" value={`${loanGroup.totalRemaining} ج.م`} />
          <InfoRow label="آخر إصدار" value={loanGroup.lastIssuedDate || '-'} />
        </div>

        {employeeLoans.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800">سلف الموظف</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-right">معرّف</th>
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                    <th className="px-3 py-2 text-right">المتبقي</th>
                    <th className="px-3 py-2 text-right">نوع السداد</th>
                    <th className="px-3 py-2 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeeLoans.map((loan) => (
                    <tr key={loan.loanId}>
                      <td className="px-3 py-2">{loan.loanId}</td>
                      <td className="px-3 py-2">{loan.issuedDate}</td>
                      <td className="px-3 py-2">{loan.amount} ج.م</td>
                      <td className="px-3 py-2">{loan.remainingAmount} ج.م</td>
                      <td className="px-3 py-2">{loan.repaymentType}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {onPay && (
                            <button
                              onClick={() => onPay(loan)}
                              className="min-w-[70px] px-3 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-xs"
                            >
                              سداد
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => onEdit(loan)}
                              className="min-w-[70px] px-3 py-1 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-xs"
                            >
                              تعديل
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => onDelete(loan)}
                              className="min-w-[70px] px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-xs"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {Object.keys(totals).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-800">إجمالي سلف هذا الموظف لكل شهر</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-right">الشهر</th>
                    <th className="px-3 py-2 text-right">عدد السلف</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(totals).map(([month, info]) => (
                    <tr key={month}>
                      <td className="px-3 py-2">{month}</td>
                      <td className="px-3 py-2">{info.count}</td>
                      <td className="px-3 py-2">{info.amount} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="font-semibold text-gray-900">{value || '-'}</p>
    </div>
  );
}

function ImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = (mode) => {
    if (!file) return;
    
    importFromExcel(
      file,
      (data) => onImport(data, mode),
      (error) => console.error('Import error:', error)
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="استيراد Excel" size="sm">
      <div className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            إلغاء
          </button>
          <button
            onClick={() => handleImport('merge')}
            disabled={!file}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            دمج
          </button>
          <button
            onClick={() => handleImport('replace')}
            disabled={!file}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
          >
            استبدال
          </button>
        </div>
      </div>
    </Modal>
  );
}



