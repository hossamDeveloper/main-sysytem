import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { EmployeesAndSalaries } from './modules/EmployeesAndSalaries/EmployeesAndSalaries';

function App() {
  const [activeModule, setActiveModule] = useState('employees');

  const renderModule = () => {
    if (['employees', 'attendance', 'loans', 'payslips'].includes(activeModule)) {
      return <EmployeesAndSalaries activeSubModule={activeModule} />;
    }
    return <EmployeesAndSalaries activeSubModule="employees" />;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <main className="flex-1 p-8 overflow-y-auto">
        {renderModule()}
      </main>
    </div>
  );
}

export default App;
