import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useUpdatePermissions,
} from '../services/userManagementQueries';
import {
  AVAILABLE_MODULES,
  PERMISSION_TYPES,
} from '../services/userManagementApi';
import { Modal } from '../components/Modal';

export function UserManagement() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const updatePermissionsMutation = useUpdatePermissions();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    roleName: '', // اسم الدور المخصص
  });
  const [formErrors, setFormErrors] = useState({});
  const [permissions, setPermissions] = useState({});

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    }

    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!showEditModal && !formData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'viewer',
      roleName: '',
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      roleName: user.roleName || '',
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleOpenPermissionsModal = (user) => {
    setSelectedUser(user);
    setPermissions(user.permissions || {});
    setShowPermissionsModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // الصلاحيات سيتم تعيينها تلقائياً حسب الدور في API
      // admin: جميع الصلاحيات (عرض، إضافة، تعديل، حذف)
      // editor: عرض، إضافة، تعديل فقط (بدون حذف)
      // للوحدات الأخرى: إضافة وتعديل فقط
      await createUserMutation.mutateAsync({
        ...formData,
        // لا نرسل permissions - سيتم تعيينها تلقائياً حسب الدور
      });
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'viewer', roleName: '' });
    } catch (error) {
      setFormErrors({ submit: error.message });
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        roleName: formData.roleName,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUserMutation.mutateAsync({
        userId: selectedUser.id,
        userData: updateData,
      });
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      setFormErrors({ submit: error.message });
    }
  };

  const handleSavePermissions = async () => {
    try {
      await updatePermissionsMutation.mutateAsync({
        userId: selectedUser.id,
        permissions,
      });
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (error) {
      alert('حدث خطأ أثناء حفظ الصلاحيات: ' + error.message);
    }
  };

  const handlePermissionChange = (moduleId, permissionType, value) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [permissionType]: value,
      },
    }));
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟`)) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (error) {
        alert('حدث خطأ أثناء حذف المستخدم: ' + error.message);
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'PurchasingManager':
        return 'bg-purple-100 text-purple-800';
      case 'HR':
        return 'bg-green-100 text-green-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (userItem) => {
    // إذا كان هناك اسم دور مخصص، استخدمه
    if (userItem.roleName && userItem.roleName.trim()) {
      return userItem.roleName;
    }
    // وإلا استخدم الاسم الافتراضي
    switch (userItem.role) {
      case 'admin':
        return 'مدير';
      case 'PurchasingManager':
        return 'مدير المشتريات';
      case 'HR':
        return 'موارد بشرية';
      case 'editor':
        return 'محرر';
      case 'viewer':
        return 'مشاهد';
      default:
        return userItem.role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                إدارة المستخدمين
              </h1>
              <p className="text-gray-600">
                إضافة وتعديل المستخدمين وإدارة الصلاحيات
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                العودة
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* Add User Button */}
          <div className="mb-6">
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
            >
              + إضافة مستخدم جديد
            </button>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">جاري التحميل...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      الاسم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      البريد الإلكتروني
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      الصلاحية
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userItem.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                            userItem.role
                          )}`}
                        >
                          {getRoleName(userItem)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenPermissionsModal(userItem)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            الصلاحيات
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(userItem)}
                            className="text-green-600 hover:text-green-900"
                          >
                            تعديل
                          </button>
                          {userItem.id !== user?.id && (
                            <button
                              onClick={() =>
                                handleDeleteUser(userItem.id, userItem.name)
                              }
                              className="text-red-600 hover:text-red-900"
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
          )}

          {/* Add User Modal */}
          {showAddModal && (
            <Modal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              title="إضافة مستخدم جديد"
            >
              <form onSubmit={handleSubmitAdd} className="space-y-4">
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {formErrors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الصلاحية الأساسية
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="admin">مدير</option>
                    <option value="PurchasingManager">مدير المشتريات</option>
                    <option value="HR">موارد بشرية</option>
                    <option value="editor">محرر</option>
                    <option value="viewer">مشاهد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الدور المخصص (اختياري)
                  </label>
                  <input
                    type="text"
                    name="roleName"
                    value={formData.roleName}
                    onChange={handleInputChange}
                    placeholder="مثال: مدير الموارد البشرية، محاسب أول..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    يمكنك إدخال اسم مخصص للدور سيظهر بدلاً من الاسم الافتراضي
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={createUserMutation.isPending}
                    className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    {createUserMutation.isPending ? 'جاري الإضافة...' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Edit User Modal */}
          {showEditModal && (
            <Modal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              title="تعديل المستخدم"
            >
              <form onSubmit={handleSubmitEdit} className="space-y-4">
                {formErrors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {formErrors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور (اتركه فارغاً إذا لم ترد التغيير)
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الصلاحية الأساسية
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="admin">مدير</option>
                    <option value="PurchasingManager">مدير المشتريات</option>
                    <option value="HR">موارد بشرية</option>
                    <option value="editor">محرر</option>
                    <option value="viewer">مشاهد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الدور المخصص (اختياري)
                  </label>
                  <input
                    type="text"
                    name="roleName"
                    value={formData.roleName}
                    onChange={handleInputChange}
                    placeholder="مثال: مدير الموارد البشرية، محاسب أول..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    يمكنك إدخال اسم مخصص للدور سيظهر بدلاً من الاسم الافتراضي
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    {updateUserMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Permissions Modal */}
          {showPermissionsModal && selectedUser && (
            <Modal
              isOpen={showPermissionsModal}
              onClose={() => setShowPermissionsModal(false)}
              title={`إدارة صلاحيات: ${selectedUser.name}`}
              size="large"
            >
              <div className="space-y-6">
                <p className="text-sm text-gray-600 mb-4">
                  اختر الصلاحيات المطلوبة لكل قسم من أقسام الموقع
                </p>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {AVAILABLE_MODULES.map((module) => (
                    <div
                      key={module.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-800">
                          {module.name}
                        </h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {PERMISSION_TYPES.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex items-center space-x-2 space-x-reverse cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={
                                permissions[module.id]?.[permission.id] || false
                              }
                              onChange={(e) =>
                                handlePermissionChange(
                                  module.id,
                                  permission.id,
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                            />
                            <span className="text-sm text-gray-700">
                              {permission.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleSavePermissions}
                    disabled={updatePermissionsMutation.isPending}
                    className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    {updatePermissionsMutation.isPending
                      ? 'جاري الحفظ...'
                      : 'حفظ الصلاحيات'}
                  </button>
                  <button
                    onClick={() => setShowPermissionsModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

