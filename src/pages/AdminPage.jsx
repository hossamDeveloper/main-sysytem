import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useCurrentUser } from '../services/userApi';
import { useUsers } from '../services/userManagementQueries';

export function AdminPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser, isLoading } = useCurrentUser(token);
  const { data: users = [] } = useUsers();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const displayUser = currentUser || user;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة تحكم المدير</h1>
              {isLoading ? (
                <p className="text-gray-600">جاري تحميل البيانات...</p>
              ) : (
                <p className="text-gray-600">
                  مرحباً، {displayUser?.name} ({displayUser?.email})
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                العودة للوحة الرئيسية
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h2 className="font-semibold text-blue-800 mb-2">صلاحيات المدير</h2>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>الوصول الكامل للنظام</li>
                <li>إدارة المستخدمين</li>
                <li>تكوين النظام</li>
                <li>تصدير البيانات والتقارير</li>
                <li>تعيين الصلاحيات</li>
              </ul>
            </div>

            {/* User Management Card */}
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-lg p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    إدارة المستخدمين والصلاحيات
                  </h3>
                  <p className="text-gray-600 mb-4">
                    إضافة مستخدمين جدد وتعديل الصلاحيات لكل جزء من الموقع
                  </p>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
                  >
                    فتح إدارة المستخدمين
                  </button>
                </div>
                <div className="text-6xl">👥</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-sky-50 p-6 rounded-lg">
                <h3 className="font-semibold text-sky-800 mb-2">المستخدمين</h3>
                <p className="text-3xl font-bold text-sky-600">{users.length}</p>
                <p className="text-sm text-sky-600 mt-1">إجمالي المستخدمين</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">نشط</h3>
                <p className="text-3xl font-bold text-green-600">{users.length}</p>
                <p className="text-sm text-green-600 mt-1">المستخدمين النشطين</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">التقارير</h3>
                <p className="text-3xl font-bold text-purple-600">45</p>
                <p className="text-sm text-purple-600 mt-1">هذا الشهر</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

