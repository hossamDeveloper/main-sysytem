import { useState, useEffect, useMemo } from 'react';
import { useERPStorage } from '../../hooks/useERPStorage';
import { exportToExcel, importFromExcel } from '../../utils/excelUtils';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';

export function Attendance() {
  const { data: attendanceData, addItem, updateItem, deleteItem, replaceAll } = useERPStorage('attendance');
  const { data: employees } = useERPStorage('employees');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getMonthDays = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysCount = getDaysInMonth(year, month);
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        date,
        dayName: new Date(year, month - 1, i).toLocaleDateString('ar-SA', { weekday: 'short' }),
      });
    }
    return days;
  }, [selectedMonth]);

  const getAttendanceRecord = (employeeId, date) => {
    return attendanceData.find(
      record => record.employeeId === employeeId && record.date === date
    );
  };

  const toggleEmployeeSelection = (employeeId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const toggleAttendance = (employeeId, date) => {
    const existing = getAttendanceRecord(employeeId, date);
    
    if (existing) {
      // إذا كان موجود، احذفه (غياب)
      deleteItem(existing.attendanceId, 'attendanceId');
      showToast('تم تسجيل الغياب');
    } else {
      // إذا لم يكن موجود، أضفه (حضور)
      const attendanceId = `A-${date.replace(/-/g, '')}-${employeeId}-${Date.now()}`;
      const hoursCalc = calculateHours('09:00', '17:00');
      addItem({
        attendanceId,
        employeeId,
        date,
        checkIn: '09:00',
        checkOut: '17:00',
        hoursWorked: hoursCalc.totalHours,
        overtimeHours: hoursCalc.overtimeHours,
        present: true,
        notes: '',
      });
      showToast('تم تسجيل الحضور');
    }
  };

  const handleEditTime = (employeeId, date) => {
    const record = getAttendanceRecord(employeeId, date);
    if (record) {
      setEditingRecord(record);
      setIsEditModalOpen(true);
    }
  };

  const saveTimeEdit = (checkIn, checkOut) => {
    if (editingRecord) {
      const hoursCalc = calculateHours(checkIn, checkOut);
      updateItem(editingRecord.attendanceId, {
        ...editingRecord,
        checkIn,
        checkOut,
        hoursWorked: hoursCalc.totalHours,
        overtimeHours: hoursCalc.overtimeHours,
      }, 'attendanceId');
      showToast('تم تحديث الأوقات بنجاح');
      setIsEditModalOpen(false);
      setEditingRecord(null);
    }
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return { totalHours: 0, overtimeHours: 0 };
    const [inHour, inMin] = checkIn.split(':').map(Number);
    const [outHour, outMin] = checkOut.split(':').map(Number);
    const inTime = inHour * 60 + inMin;
    const outTime = outHour * 60 + outMin;
    const totalHours = (outTime - inTime) / 60;
    
    // يوم العمل العادي: من 9 صباحاً (540 دقيقة) إلى 5 مساءاً (1020 دقيقة) = 8 ساعات
    const normalStart = 9 * 60; // 540 دقيقة (9:00)
    const normalEnd = 17 * 60; // 1020 دقيقة (17:00)
    const normalHours = 8;
    
    let overtimeHours = 0;
    
    // حساب الساعات الإضافية
    // الساعات قبل 9 صباحاً
    if (inTime < normalStart) {
      overtimeHours += (normalStart - inTime) / 60;
    }
    
    // الساعات بعد 5 مساءاً
    if (outTime > normalEnd) {
      overtimeHours += (outTime - normalEnd) / 60;
    }
    
    // إذا كان الدخول بعد 9 صباحاً أو الخروج قبل 5 مساءاً
    // نحسب الساعات الفعلية في وقت العمل العادي
    const actualNormalStart = Math.max(inTime, normalStart);
    const actualNormalEnd = Math.min(outTime, normalEnd);
    const actualNormalHours = Math.max(0, (actualNormalEnd - actualNormalStart) / 60);
    
    // إذا كانت الساعات الفعلية أقل من 8 ساعات، لا يوجد ساعات إضافية
    // بل نقص في الساعات
    if (actualNormalHours < normalHours && totalHours < normalHours) {
      overtimeHours = 0;
    }
    
    return {
      totalHours: parseFloat(totalHours.toFixed(1)),
      overtimeHours: parseFloat(Math.max(0, overtimeHours).toFixed(1)),
    };
  };

  const getEmployeeAttendanceDays = (employeeId) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
    
    return attendanceData.filter(record => 
      record.employeeId === employeeId &&
      record.date >= startDate &&
      record.date <= endDate &&
      record.present !== false
    ).length;
  };

  const handleExport = () => {
    if (attendanceData.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'error');
      return;
    }
    exportToExcel(attendanceData, 'attendance', 'erp_export_attendance.xlsx');
    showToast('تم تصدير البيانات بنجاح');
  };

  const handleImport = (importedData, mode) => {
    try {
      const processedData = importedData.map(item => ({
        attendanceId: item.attendanceId || item['attendanceId'] || `A-${Date.now()}-${Math.random()}`,
        employeeId: item.employeeId || item['employeeId'],
        date: item.date || item['date'],
        checkIn: item.checkIn || item['checkIn'] || '09:00',
        checkOut: item.checkOut || item['checkOut'] || '17:00',
        hoursWorked: item.hoursWorked || item['hoursWorked'] || (() => {
          const calc = calculateHours(item.checkIn || item['checkIn'] || '09:00', item.checkOut || item['checkOut'] || '17:00');
          return calc.totalHours;
        })(),
        overtimeHours: item.overtimeHours || item['overtimeHours'] || (() => {
          const calc = calculateHours(item.checkIn || item['checkIn'] || '09:00', item.checkOut || item['checkOut'] || '17:00');
          return calc.overtimeHours;
        })(),
        present: item.present !== false,
        notes: item.notes || item['notes'] || '',
      }));

      if (mode === 'replace') {
        replaceAll(processedData);
        showToast('تم استبدال البيانات بنجاح');
      } else if (mode === 'merge') {
        processedData.forEach(item => {
          const existing = attendanceData.find(att => att.attendanceId === item.attendanceId);
          if (existing) {
            updateItem(item.attendanceId, item, 'attendanceId');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">الحضور والانصراف</h2>
        <div className="flex gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
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
        </div>
      </div>

      {/* قائمة الموظفين مع Checkbox */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">اختر الموظفين</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {employees.map(employee => (
            <label
              key={employee.employeeId}
              className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedEmployees.has(employee.employeeId)}
                onChange={() => toggleEmployeeSelection(employee.employeeId)}
                className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-gray-700">{employee.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* جدول الحضور الشهري */}
      {selectedEmployees.size > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sky-100">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-800 sticky right-0 bg-sky-100 z-10">
                    الموظف / الأيام
                  </th>
                  {getMonthDays.map(day => (
                    <th
                      key={day.date}
                      className="px-2 py-3 text-center font-semibold text-gray-800 min-w-[80px]"
                      title={day.dayName}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-600">{day.dayName}</span>
                        <span>{day.day}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 bg-sky-200">
                    إجمالي الأيام
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-800 bg-sky-200">
                    الساعات الإضافية
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Array.from(selectedEmployees).map(employeeId => {
                  const employee = employees.find(emp => emp.employeeId === employeeId);
                  if (!employee) return null;
                  
                  const attendanceDays = getEmployeeAttendanceDays(employeeId);
                  
                  return (
                    <tr key={employeeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-right font-medium text-gray-800 sticky right-0 bg-white z-10 border-r-2 border-gray-200">
                        {employee.name}
                      </td>
                      {getMonthDays.map(day => {
                        const record = getAttendanceRecord(employeeId, day.date);
                        const isPresent = record && record.present !== false;
                        
                        return (
                          <td
                            key={day.date}
                            className="px-2 py-2 text-center border border-gray-100"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={() => toggleAttendance(employeeId, day.date)}
                                className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500"
                                title={isPresent ? 'حاضر' : 'غائب'}
                              />
                              {isPresent && record && (
                                <div className="text-xs space-y-0.5">
                                  <div className="text-emerald-600 font-semibold">
                                    {record.checkIn}
                                  </div>
                                  <div className="text-rose-600 font-semibold">
                                    {record.checkOut}
                                  </div>
                                  {record.overtimeHours > 0 && (
                                    <div className="text-orange-600 font-semibold" title="ساعات إضافية">
                                      +{record.overtimeHours}س
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleEditTime(employeeId, day.date)}
                                    className="text-sky-600 hover:text-sky-700 text-xs underline"
                                    title="تعديل الأوقات"
                                  >
                                    تعديل
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold text-gray-800 bg-sky-50">
                        {attendanceDays} يوم
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800 bg-sky-50">
                        {(() => {
                          const [year, month] = selectedMonth.split('-').map(Number);
                          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                          const endDate = `${year}-${String(month).padStart(2, '0')}-${String(getDaysInMonth(year, month)).padStart(2, '0')}`;
                          const records = attendanceData.filter(record => 
                            record.employeeId === employeeId &&
                            record.date >= startDate &&
                            record.date <= endDate &&
                            record.present !== false
                          );
                          const totalOvertime = records.reduce((sum, r) => sum + (parseFloat(r.overtimeHours) || 0), 0);
                          return totalOvertime > 0 ? `${totalOvertime.toFixed(1)} ساعة` : '-';
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEmployees.size === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          <p>يرجى اختيار موظف واحد على الأقل لعرض جدول الحضور</p>
        </div>
      )}

      <EditTimeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={saveTimeEdit}
        record={editingRecord}
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

function EditTimeModal({ isOpen, onClose, onSave, record }) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  useEffect(() => {
    if (record) {
      setCheckIn(record.checkIn || '08:00');
      setCheckOut(record.checkOut || '17:00');
    }
  }, [record]);

  const handleSave = () => {
    if (checkIn && checkOut) {
      onSave(checkIn, checkOut);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعديل أوقات الحضور والانصراف" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            وقت الحضور
          </label>
          <input
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            وقت الانصراف
          </label>
          <input
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex gap-3 justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            حفظ
          </button>
        </div>
      </div>
    </Modal>
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
