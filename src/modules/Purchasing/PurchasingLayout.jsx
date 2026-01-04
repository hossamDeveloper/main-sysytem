import { Sidebar } from '../../components/Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function PurchasingLayout() {
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('dashboard');

  // Determine active module based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/purchasing' || path === '/purchasing/') {
      setActiveModule('purchasing-dashboard');
    } else if (path.includes('/suppliers')) {
      setActiveModule('suppliers');
    } else if (path.includes('/purchase-requests')) {
      setActiveModule('purchase-requests');
    } else if (path.includes('/purchase-orders')) {
      setActiveModule('purchase-orders');
    } else if (path.includes('/goods-receipt')) {
      setActiveModule('goods-receipt');
    } else if (path.includes('/invoices')) {
      setActiveModule('invoices');
    }
  }, [location.pathname]);

  const handleModuleChange = (moduleId) => {
    // This is for dashboard navigation, not used in purchasing module
    setActiveModule(moduleId);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

