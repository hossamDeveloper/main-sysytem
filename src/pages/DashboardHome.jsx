import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useCurrentUser } from '../services/userApi';
import { useERPStorage } from '../hooks/useERPStorage';
import { useModulePermissions } from '../hooks/usePermissions';
import { useMemo } from 'react';
import { useDashboardStats } from '../services/purchasingQueries';

export function DashboardHome({ onNavigate }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser, isLoading } = useCurrentUser(token);
  
  const { data: employees } = useERPStorage('employees');
  const { data: attendance } = useERPStorage('attendance');
  const { data: loans } = useERPStorage('loans');
  const { data: payslips } = useERPStorage('payslips');

  const employeesPermissions = useModulePermissions('employees');
  const attendancePermissions = useModulePermissions('attendance');
  const loansPermissions = useModulePermissions('loans');
  const payslipsPermissions = useModulePermissions('payslips');
  const purchasingPermissions = useModulePermissions('purchasing');
  const { data: purchasingStats } = useDashboardStats();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthAttendance = attendance.filter(
      (a) => a.date?.startsWith(currentMonth) && a.present !== false
    );
    
    const totalLoans = loans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
    const totalRemaining = loans.reduce((sum, loan) => {
      const remaining = parseFloat(loan.remainingAmount) || parseFloat(loan.amount) || 0;
      return sum + remaining;
    }, 0);

    const currentMonthPayslips = payslips.filter(
      (p) => p.periodStart?.startsWith(currentMonth)
    );
    const totalSalaries = currentMonthPayslips.reduce(
      (sum, p) => sum + (parseFloat(p.netPay) || 0),
      0
    );

    return {
      totalEmployees: employees.length,
      currentMonthAttendance: currentMonthAttendance.length,
      totalLoans: totalLoans.toFixed(2),
      totalRemainingLoans: totalRemaining.toFixed(2),
      currentMonthPayslips: currentMonthPayslips.length,
      totalSalaries: totalSalaries.toFixed(2),
    };
  }, [employees, attendance, loans, payslips]);

  const displayUser = currentUser || user;

  const quickLinks = [
    {
      id: 'employees',
      name: 'إدارة الموظفين',
      icon: '👥',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/dashboard',
      module: 'employees',
      permission: employeesPermissions.view,
    },
    {
      id: 'attendance',
      name: 'الحضور والانصراف',
      icon: '📅',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/dashboard',
      module: 'attendance',
      permission: attendancePermissions.view,
    },
    {
      id: 'loans',
      name: 'قسم السلف',
      icon: '💰',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      path: '/dashboard',
      module: 'loans',
      permission: loansPermissions.view,
    },
    {
      id: 'payslips',
      name: 'كشف الرواتب',
      icon: '📄',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      path: '/dashboard',
      module: 'payslips',
      permission: payslipsPermissions.view,
    },
    {
      id: 'purchasing',
      name: 'المشتريات',
      icon: '🛒',
      color: 'bg-sky-500',
      hoverColor: 'hover:bg-sky-600',
      path: '/purchasing',
      module: null,
      permission: purchasingPermissions.view,
    },
    {
      id: 'suppliers',
      name: 'إدارة الموردين',
      icon: '🏢',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600',
      path: '/purchasing/suppliers',
      module: null,
      permission: purchasingPermissions.view,
    },
    {
      id: 'purchase-requests',
      name: 'طلبات الشراء',
      icon: '📋',
      color: 'bg-teal-500',
      hoverColor: 'hover:bg-teal-600',
      path: '/purchasing/purchase-requests',
      module: null,
      permission: purchasingPermissions.view,
    },
    {
      id: 'purchase-orders',
      name: 'أوامر الشراء',
      icon: '📝',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      path: '/purchasing/purchase-orders',
      module: null,
      permission: purchasingPermissions.view,
    },
    {
      id: 'goods-receipt',
      name: 'استلام البضائع',
      icon: '📦',
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600',
      path: '/purchasing/goods-receipt',
      module: null,
      permission: purchasingPermissions.view,
    },
    {
      id: 'invoices',
      name: 'الفواتير',
      icon: '🧾',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      path: '/purchasing/invoices',
      module: null,
      permission: purchasingPermissions.view,
    },
  ].filter((link) => link.permission); // إظهار فقط الروابط التي لديه صلاحية عليها

  const handleQuickLink = (module) => {
    if (onNavigate) {
      onNavigate(module);
      // Also update hash
      window.location.hash = module;
    } else {
      window.location.hash = module;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم</h1>
          {isLoading ? (
            <p className="text-gray-600">جاري تحميل البيانات...</p>
          ) : (
            <p className="text-gray-600">
              مرحباً، {displayUser?.name}
              {displayUser?.roleName && ` (${displayUser.roleName})`}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          تسجيل الخروج
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">إجمالي الموظفين</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalEmployees}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">حضور هذا الشهر</p>
              <p className="text-3xl font-bold text-gray-800">{stats.currentMonthAttendance}</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">إجمالي السلف</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalLoans}</p>
              <p className="text-xs text-gray-500 mt-1">متبقي: {stats.totalRemainingLoans} ج.م</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">رواتب هذا الشهر</p>
              <p className="text-3xl font-bold text-gray-800">{stats.currentMonthPayslips}</p>
              <p className="text-xs text-gray-500 mt-1">إجمالي: {stats.totalSalaries} ج.م</p>
            </div>
            <div className="text-4xl">📄</div>
          </div>
        </div>

        {/* Purchasing Statistics - Show only if user has permissions */}
        {purchasingPermissions.view && purchasingStats && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-sky-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">إجمالي الموردين</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {purchasingStats.totalSuppliers || 0}
                  </p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-teal-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">طلبات الشراء المفتوحة</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {purchasingStats.openPRs || 0}
                  </p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">أوامر الشراء المفتوحة</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {purchasingStats.openPOs || 0}
                  </p>
                </div>
                <div className="text-4xl">📝</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">الفواتير المعلقة</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {purchasingStats.pendingInvoices || 0}
                  </p>
                </div>
                <div className="text-4xl">🧾</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">روابط سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleQuickLink(link)}
              className={`${link.color} ${link.hoverColor} text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-md`}
            >
              <div className="text-4xl mb-3">{link.icon}</div>
              <div className="text-lg font-semibold">{link.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity or Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">معلومات سريعة</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">إجمالي الموظفين</span>
              <span className="font-semibold text-gray-800">{stats.totalEmployees}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">سلف نشطة</span>
              <span className="font-semibold text-gray-800">{loans.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">كشوف رواتب هذا الشهر</span>
              <span className="font-semibold text-gray-800">{stats.currentMonthPayslips}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">سجلات حضور هذا الشهر</span>
              <span className="font-semibold text-gray-800">{stats.currentMonthAttendance}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">صلاحياتك</h3>
          <div className="space-y-2">
            {employeesPermissions.view && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>عرض الموظفين</span>
                {employeesPermissions.create && <span className="text-blue-500">+ إضافة</span>}
                {employeesPermissions.edit && <span className="text-yellow-500">✎ تعديل</span>}
                {employeesPermissions.delete && <span className="text-red-500">🗑 حذف</span>}
              </div>
            )}
            {attendancePermissions.view && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>عرض الحضور</span>
                {attendancePermissions.create && <span className="text-blue-500">+ إضافة</span>}
                {attendancePermissions.edit && <span className="text-yellow-500">✎ تعديل</span>}
              </div>
            )}
            {loansPermissions.view && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>عرض السلف</span>
                {loansPermissions.create && <span className="text-blue-500">+ إضافة</span>}
                {loansPermissions.edit && <span className="text-yellow-500">✎ تعديل</span>}
                {loansPermissions.delete && <span className="text-red-500">🗑 حذف</span>}
              </div>
            )}
            {payslipsPermissions.view && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span>
                <span>عرض الرواتب</span>
                {payslipsPermissions.create && <span className="text-blue-500">+ إضافة</span>}
                {payslipsPermissions.edit && <span className="text-yellow-500">✎ تعديل</span>}
                {payslipsPermissions.delete && <span className="text-red-500">🗑 حذف</span>}
              </div>
            )}
            {!employeesPermissions.view && !attendancePermissions.view && 
             !loansPermissions.view && !payslipsPermissions.view && (
              <p className="text-gray-500 text-sm">لا توجد صلاحيات متاحة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

