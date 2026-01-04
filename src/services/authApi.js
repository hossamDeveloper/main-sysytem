// Mock API service for authentication
// Simulates API calls with delays

// Default users
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

// Get all users from localStorage (includes both default and created users)
// Initialize with default users if localStorage is empty
const getAllUsers = () => {
  try {
    const stored = localStorage.getItem('erp_users');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    }
    // If no users in localStorage, initialize with default users
    localStorage.setItem('erp_users', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  } catch (error) {
    console.error('Error reading stored users:', error);
    // If error, return default users
    return DEFAULT_USERS;
  }
};

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const authApi = {
  login: async (email, password) => {
    await delay(1000); // Simulate network delay

    const users = getAllUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Generate mock token
    const token = `mock_token_${user.id}_${Date.now()}`;

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  },

  getCurrentUser: async (token) => {
    await delay(500);

    if (!token) {
      throw new Error('No token provided');
    }

    // Extract user ID from token (mock implementation)
    const tokenParts = token.split('_');
    if (tokenParts.length < 3) {
      throw new Error('Invalid token');
    }

    const userId = parseInt(tokenParts[2]);
    const users = getAllUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  logout: async () => {
    await delay(300);
    return { success: true };
  },
};

