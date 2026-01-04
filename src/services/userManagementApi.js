// Mock API service for user management
// Simulates API calls with delays

// Get users from localStorage or use default
const getStoredUsers = () => {
  try {
    const stored = localStorage.getItem('erp_users');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading stored users:', error);
  }
  return [];
};

// Save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem('erp_users', JSON.stringify(users));
};

// Default users (will be merged with stored users)
const DEFAULT_USERS = [
  {
    id: 1,
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    roleName: '',
    name: 'Admin User',
    permissions: {
      employees: { view: true, create: true, edit: true, delete: true },
      attendance: { view: true, create: true, edit: true, delete: true },
      loans: { view: true, create: true, edit: true, delete: true },
      payslips: { view: true, create: true, edit: true, delete: true },
      users: { view: true, create: true, edit: true, delete: true },
    },
  },
  {
    id: 2,
    email: 'editor@example.com',
    password: 'editor123',
    role: 'editor',
    roleName: '',
    name: 'Editor User',
    permissions: {
      employees: { view: true, create: true, edit: true, delete: false },
      attendance: { view: true, create: true, edit: true, delete: false },
      loans: { view: true, create: true, edit: true, delete: false },
      payslips: { view: true, create: true, edit: true, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
  {
    id: 3,
    email: 'viewer@example.com',
    password: 'viewer123',
    role: 'viewer',
    roleName: '',
    name: 'Viewer User',
    permissions: {
      employees: { view: true, create: false, edit: false, delete: false },
      attendance: { view: true, create: false, edit: false, delete: false },
      loans: { view: true, create: false, edit: false, delete: false },
      payslips: { view: true, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
    },
  },
];

// Initialize users if not exists
const initializeUsers = () => {
  const stored = getStoredUsers();
  if (stored.length === 0) {
    saveUsers(DEFAULT_USERS);
    return DEFAULT_USERS;
  }
  return stored;
};

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate default permissions based on role
const generateDefaultPermissions = (role) => {
  const permissions = {};
  
  // قائمة الوحدات الخاصة بموظفي الموارد البشرية
  const hrModules = ['employees', 'attendance', 'loans', 'payslips'];
  
  AVAILABLE_MODULES.forEach((module) => {
    if (role === 'admin') {
      // Admin: جميع الصلاحيات (عرض، إضافة، تعديل، حذف) لجميع الوحدات
      permissions[module.id] = {
        view: true,
        create: true,
        edit: true,
        delete: true,
      };
    } else if (role === 'PurchasingManager') {
      // PurchasingManager: صلاحيات تعديل وإضافة على المشتريات فقط
      permissions[module.id] = module.id === 'purchasing'
        ? { view: true, create: true, edit: true, delete: false }
        : { view: false, create: false, edit: false, delete: false };
    } else if (role === 'HR') {
      // HR: صلاحيات تعديل وإضافة على قسم الموظفين والرواتب فقط
      permissions[module.id] = hrModules.includes(module.id)
        ? { view: true, create: true, edit: true, delete: false }
        : { view: false, create: false, edit: false, delete: false };
    } else if (role === 'editor') {
      // Editor: عرض، إضافة، تعديل فقط (بدون حذف) لجميع الوحدات
      permissions[module.id] = {
        view: true,
        create: true,
        edit: true,
        delete: false,
      };
    } else {
      // للوحدات الأخرى (viewer أو أدوار مخصصة): إضافة وتعديل فقط لكل module
      // ملاحظة: يمكن تعديل الصلاحيات لاحقاً من خلال نافذة الصلاحيات
      permissions[module.id] = {
        view: false,
        create: true,
        edit: true,
        delete: false,
      };
    }
  });
  
  return permissions;
};

// Available modules and their permissions
export const AVAILABLE_MODULES = [
  {
    id: 'employees',
    name: 'إدارة الموظفين',
    description: 'إضافة وتعديل وحذف بيانات الموظفين',
  },
  {
    id: 'attendance',
    name: 'الحضور والانصراف',
    description: 'تسجيل وإدارة الحضور والانصراف',
  },
  {
    id: 'loans',
    name: 'قسم السلف',
    description: 'إدارة السلف والديون',
  },
  {
    id: 'payslips',
    name: 'كشف الرواتب',
    description: 'إنشاء وإدارة كشوف الرواتب',
  },
  {
    id: 'users',
    name: 'إدارة المستخدمين',
    description: 'إضافة وتعديل المستخدمين والصلاحيات',
  },
  {
    id: 'reports',
    name: 'التقارير',
    description: 'عرض وتصدير التقارير',
  },
  {
    id: 'settings',
    name: 'الإعدادات',
    description: 'إعدادات النظام العامة',
  },
  {
    id: 'purchasing',
    name: 'وحدة المشتريات',
    description: 'إدارة الموردين وطلبات الشراء وأوامر الشراء',
  },
];

export const PERMISSION_TYPES = [
  { id: 'view', name: 'عرض', description: 'القدرة على عرض المحتوى' },
  { id: 'create', name: 'إضافة', description: 'القدرة على إضافة محتوى جديد' },
  { id: 'edit', name: 'تعديل', description: 'القدرة على تعديل المحتوى' },
  { id: 'delete', name: 'حذف', description: 'القدرة على حذف المحتوى' },
];

export const userManagementApi = {
  // Get all users
  getUsers: async () => {
    await delay(500);
    const users = initializeUsers();
    // Return users without passwords
    return users.map(({ password, ...user }) => user);
  },

  // Get single user
  getUser: async (userId) => {
    await delay(300);
    const users = initializeUsers();
    const user = users.find((u) => u.id === parseInt(userId));
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Create new user
  createUser: async (userData) => {
    await delay(800);
    const users = initializeUsers();

    // Check if email already exists
    if (users.some((u) => u.email === userData.email)) {
      throw new Error('Email already exists');
    }

    // Generate new ID
    const newId = Math.max(...users.map((u) => u.id), 0) + 1;

    // Create user with default permissions based on role if not provided
    const userRole = userData.role || 'viewer';
    const defaultPermissions = userData.permissions || generateDefaultPermissions(userRole);

    const newUser = {
      id: newId,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userRole,
      roleName: userData.roleName || '',
      permissions: defaultPermissions,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Update user
  updateUser: async (userId, userData) => {
    await delay(800);
    const users = initializeUsers();
    const userIndex = users.findIndex((u) => u.id === parseInt(userId));

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Check if email already exists (excluding current user)
    if (
      userData.email &&
      users.some((u) => u.id !== parseInt(userId) && u.email === userData.email)
    ) {
      throw new Error('Email already exists');
    }

    // إذا تم تغيير الدور، قم بتحديث الصلاحيات تلقائياً
    const currentUser = users[userIndex];
    const newRole = userData.role;
    let updatedPermissions = currentUser.permissions;

    if (newRole && newRole !== currentUser.role) {
      // إذا تغير الدور إلى admin أو editor أو PurchasingManager أو HR، قم بتحديث الصلاحيات
      if (newRole === 'admin' || newRole === 'editor' || newRole === 'PurchasingManager' || newRole === 'HR') {
        updatedPermissions = generateDefaultPermissions(newRole);
      }
    }

    // Update user
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
      permissions: updatedPermissions,
      updatedAt: new Date().toISOString(),
    };

    saveUsers(users);

    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  },

  // Delete user
  deleteUser: async (userId) => {
    await delay(500);
    const users = initializeUsers();
    const filteredUsers = users.filter((u) => u.id !== parseInt(userId));

    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }

    saveUsers(filteredUsers);
    return { success: true };
  },

  // Update user permissions
  updatePermissions: async (userId, permissions) => {
    await delay(600);
    const users = initializeUsers();
    const userIndex = users.findIndex((u) => u.id === parseInt(userId));

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    users[userIndex].permissions = permissions;
    users[userIndex].updatedAt = new Date().toISOString();

    saveUsers(users);

    const { password, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  },
};

