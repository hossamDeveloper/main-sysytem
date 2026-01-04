import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { Sidebar } from '../components/Sidebar';
import { EmployeesAndSalaries } from '../modules/EmployeesAndSalaries/EmployeesAndSalaries';
import { DashboardHome } from './DashboardHome';
import { useState, useEffect, useCallback, useMemo } from 'react';

export function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [activeModule, setActiveModule] = useState(() => {
    // Initialize from hash if exists
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (['employees', 'attendance', 'loans', 'payslips'].includes(hash)) {
        return hash;
      }
    }
    return 'dashboard';
  });

  // Listen for hash changes to switch modules
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (['employees', 'attendance', 'loans', 'payslips'].includes(hash)) {
        setActiveModule(hash);
      } else if (!hash) {
        setActiveModule('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Check initial hash
    const initialHash = window.location.hash.slice(1);
    if (['employees', 'attendance', 'loans', 'payslips'].includes(initialHash)) {
      setActiveModule(initialHash);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleModuleChange = useCallback((moduleId) => {
    setActiveModule(moduleId);
    // Update hash immediately
    if (moduleId !== 'dashboard') {
      window.location.hash = moduleId;
    } else {
      window.location.hash = '';
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const content = useMemo(() => {
    // Always show dashboard if activeModule is dashboard
    if (activeModule === 'dashboard') {
      return <DashboardHome onNavigate={handleModuleChange} />;
    }
    
    // Show employees module if it's one of the sub-modules
    if (['employees', 'attendance', 'loans', 'payslips'].includes(activeModule)) {
      return <EmployeesAndSalaries key={activeModule} activeSubModule={activeModule} />;
    }
    
    // Default to dashboard
    return <DashboardHome onNavigate={handleModuleChange} />;
  }, [activeModule, handleModuleChange]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <main className="flex-1 p-8 overflow-y-auto">
        {content}
      </main>
    </div>
  );
}

