import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../../services/purchasingQueries';
import { useAppSelector } from '../../store/hooks';
import { useCurrentUser } from '../../services/userApi';

export function PurchasingDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser } = useCurrentUser(token);
  const { data: stats, isLoading } = useDashboardStats();

  const displayUser = currentUser || user;

  const quickLinks = [
    {
      id: 'suppliers',
      name: 'إدارة الموردين',
      icon: '🏢',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/purchasing/suppliers',
    },
    {
      id: 'products',
      name: 'المنتجات',
      icon: '📦',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/purchasing/products',
    },
    {
      id: 'custodies',
      name: 'صرف العهدة',
      icon: '💵',
      color: 'bg-yellow-500',
      hoverColor: 'hover:bg-yellow-600',
      path: '/purchasing/custodies',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">لوحة تحكم المشتريات</h1>
          <p className="text-gray-600">
            مرحباً، {displayUser?.name}
            {displayUser?.roleName && ` (${displayUser.roleName})`}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">إجمالي الموردين</p>
              <p className="text-3xl font-bold text-gray-800">
                {isLoading ? '...' : stats?.totalSuppliers || 0}
              </p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">طلبات الشراء المفتوحة</p>
              <p className="text-3xl font-bold text-gray-800">
                {isLoading ? '...' : stats?.openPRs || 0}
              </p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">أوامر الشراء المفتوحة</p>
              <p className="text-3xl font-bold text-gray-800">
                {isLoading ? '...' : stats?.openPOs || 0}
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
                {isLoading ? '...' : stats?.pendingInvoices || 0}
              </p>
            </div>
            <div className="text-4xl">🧾</div>
          </div>
        </div>

        {/* New Statistics Cards - Show if available */}
        {stats?.totalProducts !== undefined && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المنتجات</p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading ? '...' : stats?.totalProducts || 0}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>
        )}

        {stats?.openCustodies !== undefined && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">العهد المفتوحة</p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading ? '...' : stats?.openCustodies || 0}
                </p>
              </div>
              <div className="text-4xl">💵</div>
            </div>
          </div>
        )}

        {stats?.priceVarianceAlerts !== undefined && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-pink-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">تنبيهات السعر</p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading ? '...' : stats?.priceVarianceAlerts || 0}
                </p>
              </div>
              <div className="text-4xl">⚠️</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">روابط سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigate(link.path)}
              className={`${link.color} ${link.hoverColor} text-white p-6 rounded-lg transition-all transform hover:scale-105 shadow-md`}
            >
              <div className="text-4xl mb-3">{link.icon}</div>
              <div className="text-lg font-semibold">{link.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

