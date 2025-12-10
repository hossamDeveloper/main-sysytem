export function Sidebar({ activeModule, onModuleChange }) {
  const modules = [
    { id: 'employees', name: 'إضافة / إدارة الموظفين', icon: '👥' },
    { id: 'attendance', name: 'الحضور والانصراف', icon: '📅' },
    { id: 'loans', name: 'قسم السلف', icon: '💰' },
    { id: 'payslips', name: 'كشف الرواتب', icon: '📄' },
  ];

  return (
    <aside className="w-64 bg-sky-600 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">نظام ERP</h1>
        <p className="text-sky-100 text-sm mt-1">الموظفين والرواتب</p>
      </div>
      <nav className="space-y-2">
        {modules.map((module) => (
          <button
            key={module.id}
            onClick={() => onModuleChange(module.id)}
            className={`w-full text-right px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
              activeModule === module.id
                ? 'bg-white text-sky-600 font-semibold'
                : 'hover:bg-sky-700 text-white'
            }`}
            aria-current={activeModule === module.id ? 'page' : undefined}
          >
            <span className="text-xl">{module.icon}</span>
            <span>{module.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}



