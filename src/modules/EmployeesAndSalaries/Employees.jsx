import { useState } from 'react';
import { useERPStorage } from '../../hooks/useERPStorage';
import { exportToExcel, importFromExcel } from '../../utils/excelUtils';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Toast } from '../../components/Toast';

export function Employees() {
  const { data, addItem, updateItem, deleteItem, replaceAll } = useERPStorage('employees');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    jobTitle: '',
    department: '',
    hireDate: '',
    salary: '',
    fixedAllowance: '',
    payMethod: 'نقدي',
    bankAccount: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      jobTitle: '',
      department: '',
      hireDate: '',
      salary: '',
      fixedAllowance: '',
      payMethod: 'نقدي',
      bankAccount: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.name) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    if (editingItem) {
      updateItem(editingItem.employeeId, formData, 'employeeId');
      showToast('تم تحديث الموظف بنجاح');
    } else {
      if (data.some(emp => emp.employeeId === formData.employeeId)) {
        showToast('معرف الموظف موجود بالفعل', 'error');
        return;
      }
      addItem(formData);
      showToast('تم إضافة الموظف بنجاح');
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete.employeeId, 'employeeId');
      showToast('تم حذف الموظف بنجاح');
      setItemToDelete(null);
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'error');
      return;
    }
    exportToExcel(data, 'employees', 'erp_export_employees.xlsx');
    showToast('تم تصدير البيانات بنجاح');
  };

  const handleImport = (importedData, mode) => {
    try {
      const processedData = importedData.map(item => ({
        employeeId: item.employeeId || item['معرف الموظف'],
        name: item.name || item['الاسم الكامل'],
        jobTitle: item.jobTitle || item['المسمى الوظيفي'] || '',
        department: item.department || item['القسم'] || '',
        hireDate: item.hireDate || item['تاريخ التعيين'] || '',
        salary: item.salary || item['المرتب الأساسي (شهري)'] || '',
        fixedAllowance: item.fixedAllowance || item['حافز ثابت'] || '',
        payMethod: item.payMethod || item['طريقة الدفع'] || 'نقدي',
        bankAccount: item.bankAccount || item['حساب بنكي (اختياري)'] || '',
      }));

      if (mode === 'replace') {
        replaceAll(processedData);
        showToast('تم استبدال البيانات بنجاح');
      } else if (mode === 'merge') {
        processedData.forEach(item => {
          const existing = data.find(emp => emp.employeeId === item.employeeId);
          if (existing) {
            updateItem(item.employeeId, item, 'employeeId');
          } else {
            addItem(item);
          }
        });
        showToast('تم دمج البيانات بنجاح');
      }
      setIsImportModalOpen(false);
    } catch (error) {
      showToast('خطأ في استيراد البيانات', 'error');
    }
  };

  const columns = [
    { key: 'employeeId', label: 'معرف الموظف' },
    { key: 'name', label: 'الاسم الكامل' },
    { key: 'jobTitle', label: 'المسمى الوظيفي' },
    { key: 'department', label: 'القسم' },
    { key: 'hireDate', label: 'تاريخ التعيين' },
    { key: 'salary', label: 'المرتب', render: (val) => val ? `${val} ج.م` : '-' },
    { key: 'payMethod', label: 'طريقة الدفع' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">إدارة الموظفين</h2>
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
            إضافة موظف جديد
          </button>
        </div>
      </div>

      <DataTable
        data={data}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchFields={['employeeId', 'name', 'jobTitle', 'department']}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? 'تعديل موظف' : 'إضافة موظف جديد'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                معرف الموظف <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                disabled={!!editingItem}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المسمى الوظيفي</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التعيين</label>
              <input
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المرتب الأساسي (شهري)</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حافز ثابت (اختياري)</label>
              <input
                type="number"
                value={formData.fixedAllowance}
                onChange={(e) => setFormData({ ...formData, fixedAllowance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
              <select
                value={formData.payMethod}
                onChange={(e) => setFormData({ ...formData, payMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="نقدي">نقدي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="شيك">شيك</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">حساب بنكي (اختياري)</label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
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
        message={`هل أنت متأكد من حذف الموظف "${itemToDelete?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
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



