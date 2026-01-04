import { useAppSelector } from '../store/hooks';
import { useCurrentUser } from '../services/userApi';

/**
 * Hook للتحقق من صلاحيات المستخدم
 * @param {string} module - اسم الوحدة (employees, attendance, loans, payslips, etc.)
 * @param {string} permission - نوع الصلاحية (view, create, edit, delete)
 * @returns {boolean} - true إذا كان المستخدم لديه الصلاحية
 */
export const usePermission = (module, permission) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser } = useCurrentUser(token);
  
  const activeUser = currentUser || user;
  
  // Admin لديه جميع الصلاحيات
  if (activeUser?.role === 'admin') {
    return true;
  }
  
  // التحقق من الصلاحيات المخصصة
  if (activeUser?.permissions?.[module]?.[permission]) {
    return true;
  }
  
  // إذا لم يكن هناك صلاحية محددة، رجع false
  return false;
};

/**
 * Hook للحصول على جميع صلاحيات المستخدم لوحدة معينة
 * @param {string} module - اسم الوحدة
 * @returns {object} - كائن يحتوي على جميع الصلاحيات للوحدة
 */
export const useModulePermissions = (module) => {
  const { user, token } = useAppSelector((state) => state.auth);
  const { data: currentUser } = useCurrentUser(token);
  
  const activeUser = currentUser || user;
  
  // Admin لديه جميع الصلاحيات
  if (activeUser?.role === 'admin') {
    return {
      view: true,
      create: true,
      edit: true,
      delete: true,
    };
  }
  
  // إرجاع الصلاحيات المخصصة أو كلها false
  const modulePermissions = activeUser?.permissions?.[module];
  return modulePermissions || {
    view: false,
    create: false,
    edit: false,
    delete: false,
  };
};

