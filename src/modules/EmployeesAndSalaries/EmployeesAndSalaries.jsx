import { Employees } from './Employees';
import { Attendance } from './Attendance';
import { Loans } from './Loans';
import { Payslips } from './Payslips';

const modulesMap = {
  employees: Employees,
  attendance: Attendance,
  loans: Loans,
  payslips: Payslips,
};

export function EmployeesAndSalaries({ activeSubModule = 'employees' }) {
  const ModuleComponent = modulesMap[activeSubModule] || Employees;
  if (!ModuleComponent) {
    return <div>Module not found: {activeSubModule}</div>;
  }
  return <ModuleComponent />;
}


