import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';

export function Sidebar({ activeModule, onModuleChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const isPurchasingManager = user?.role === 'PurchasingManager' || isAdmin;
  const isHR = user?.role === 'HR' || isAdmin;
  const purchasingPermissions = user?.permissions?.purchasing;
  const canAccessPurchasing = isPurchasingManager || purchasingPermissions?.view;
  
  // التحقق من صلاحيات الموظفين والرواتب (HR أو admin أو لديه صلاحيات)
  const hrModules = ['employees', 'attendance', 'loans', 'payslips'];
  const hasHRPermissions = isHR || hrModules.some(module => user?.permissions?.[module]?.view);
  const [isEmployeesDropdownOpen, setIsEmployeesDropdownOpen] = useState(true);
  const [isPurchasingDropdownOpen, setIsPurchasingDropdownOpen] = useState(false);

  // Auto-open purchasing dropdown if we're in purchasing module
  useEffect(() => {
    if (location.pathname.startsWith('/purchasing')) {
      setIsPurchasingDropdownOpen(true);
    }
  }, [location.pathname]);

  const employeesSubModules = [
    { id: 'employees', name: 'إضافة / إدارة الموظفين', icon: '👥' },
    { id: 'attendance', name: 'الحضور والانصراف', icon: '📅' },
    { id: 'loans', name: 'قسم السلف', icon: '💰' },
    { id: 'payslips', name: 'كشف الرواتب', icon: '📄' },
  ];

  const purchasingSubModules = [
    { id: 'purchasing-dashboard', name: 'لوحة التحكم', icon: '📊', path: '/purchasing' },
    { id: 'suppliers', name: 'إدارة الموردين', icon: '🏢', path: '/purchasing/suppliers' },
    { id: 'products', name: 'المنتجات', icon: '📦', path: '/purchasing/products' },
    { id: 'custodies', name: 'صرف العهدة', icon: '💵', path: '/purchasing/custodies' },
    { id: 'purchase-orders', name: 'أوامر الشراء', icon: '📝', path: '/purchasing/purchase-orders' },
    { id: 'goods-receipt', name: 'استلام البضائع', icon: '📦', path: '/purchasing/goods-receipt' },
    { id: 'invoices', name: 'الفواتير', icon: '🧾', path: '/purchasing/invoices' },
  ];

  const adminModules = [
    { id: 'admin-dashboard', name: 'لوحة تحكم المدير', icon: '⚙️', path: '/admin' },
    { id: 'admin-users', name: 'إدارة المستخدمين', icon: '👤', path: '/admin/users' },
  ];

  const isEmployeesModuleActive = employeesSubModules.some(
    (module) => module.id === activeModule
  );

  // Check if we're in purchasing module
  const isPurchasingModuleActive = purchasingSubModules.some(
    (module) => location.pathname === module.path || location.pathname.startsWith(module.path + '/')
  );

  const handleEmployeesClick = () => {
    setIsEmployeesDropdownOpen(!isEmployeesDropdownOpen);
  };

  const handlePurchasingClick = () => {
    setIsPurchasingDropdownOpen(!isPurchasingDropdownOpen);
  };

  const handleSubModuleClick = (moduleId) => {
    // If we're in purchasing module, navigate to dashboard with hash
    if (location.pathname.startsWith('/purchasing')) {
      navigate(`/dashboard#${moduleId}`);
    } else if (onModuleChange) {
      onModuleChange(moduleId);
    }
    // Keep dropdown open after selection
  };

  const handlePurchasingSubModuleClick = (path) => {
    navigate(path);
  };

  return (
    <aside className="w-64 bg-sky-600 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">نظام ERP</h1>
        <p className="text-sky-100 text-sm mt-1">الموظفين والرواتب</p>
      </div>
      <nav className="space-y-2 flex-1">
        {/* Dashboard Link */}
        <button
          onClick={() => {
            if (location.pathname.startsWith('/purchasing')) {
              navigate('/dashboard');
            } else if (onModuleChange) {
              onModuleChange('dashboard');
            }
          }}
          className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
            activeModule === 'dashboard' || location.pathname === '/dashboard'
              ? 'bg-white text-sky-600 font-semibold'
              : 'hover:bg-sky-700 text-white'
          }`}
        >
          <span className="text-xl">📊</span>
          <span>لوحة التحكم</span>
        </button>

        {/* Employees and Salaries Main Module with Dropdown */}
        {hasHRPermissions && (
          <div>
            <button
              onClick={handleEmployeesClick}
              className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center justify-between gap-3 ${
                isEmployeesModuleActive
                  ? 'bg-white text-sky-600 font-semibold'
                  : 'hover:bg-sky-700 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💼</span>
                <span>الموظفين والرواتب</span>
              </div>
              <span
                className={`transition-transform ${
                  isEmployeesDropdownOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {isEmployeesDropdownOpen && (
              <div className="mt-2 mr-4 space-y-1">
                {employeesSubModules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handleSubModuleClick(module.id)}
                    className={`w-full text-right px-4 py-2 rounded-lg transition-colors flex items-center gap-3 text-sm ${
                      activeModule === module.id
                        ? 'bg-sky-500 text-white font-semibold'
                        : 'bg-sky-700/50 hover:bg-sky-700 text-white'
                    }`}
                    aria-current={activeModule === module.id ? 'page' : undefined}
                  >
                    <span className="text-lg">{module.icon}</span>
                    <span>{module.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Purchasing Module with Dropdown */}
        {canAccessPurchasing && (
          <div>
            <button
              onClick={handlePurchasingClick}
              className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center justify-between gap-3 ${
                isPurchasingModuleActive
                  ? 'bg-white text-sky-600 font-semibold'
                  : 'hover:bg-sky-700 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🛒</span>
                <span>المشتريات</span>
              </div>
              <span
                className={`transition-transform ${
                  isPurchasingDropdownOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            {/* Dropdown Menu */}
            {isPurchasingDropdownOpen && (
              <div className="mt-2 mr-4 space-y-1">
                {purchasingSubModules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handlePurchasingSubModuleClick(module.path)}
                    className={`w-full text-right px-4 py-2 rounded-lg transition-colors flex items-center gap-3 text-sm ${
                      location.pathname === module.path || location.pathname.startsWith(module.path + '/')
                        ? 'bg-sky-500 text-white font-semibold'
                        : 'bg-sky-700/50 hover:bg-sky-700 text-white'
                    }`}
                  >
                    <span className="text-lg">{module.icon}</span>
                    <span>{module.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="border-t border-sky-500 my-4 pt-4">
              <h3 className="text-xs font-semibold text-sky-200 uppercase mb-2 px-4">
                إدارة النظام
              </h3>
              {adminModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className="w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center gap-3 hover:bg-sky-700 text-white"
                >
                  <span className="text-xl">{module.icon}</span>
                  <span>{module.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}



