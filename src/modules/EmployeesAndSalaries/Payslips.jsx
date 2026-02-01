import { useState, useEffect, useMemo } from "react";
import { useERPStorage } from "../../hooks/useERPStorage";
import { exportToExcel, importFromExcel } from "../../utils/excelUtils";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Toast } from "../../components/Toast";
import logoImage from "../../assets/logo.png";
import { useModulePermissions } from '../../hooks/usePermissions';

export function Payslips() {
  const {
    data: payslipsData,
    addItem,
    updateItem,
    deleteItem,
    replaceAll,
  } = useERPStorage("payslips");
  const { data: employees } = useERPStorage("employees");
  const { data: loansData, updateItem: updateLoan } = useERPStorage("loans");
  const { data: attendanceData } = useERPStorage("attendance");
  const permissions = useModulePermissions("payslips");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isPrintAllModalOpen, setIsPrintAllModalOpen] = useState(false);
  const [printAllLocation, setPrintAllLocation] = useState("");
  const [printAllSelectedIds, setPrintAllSelectedIds] = useState(new Set());
  const [formData, setFormData] = useState({
    payslipId: "",
    employeeId: "",
    periodStart: "",
    periodEnd: "",
    basicSalary: "",
    allowances: "",
    overtimeHours: "",
    overtimeRate: "",
    penalties: "",
    rewards: "",
    insurance: "",
    deductions: [],
    netPay: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const monthFromDate = (dateObj = new Date()) =>
    `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

  const getMonthRange = (monthStr) => {
    if (!monthStr) {
      const now = new Date();
      monthStr = monthFromDate(now);
    }
    const [y, m] = monthStr.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const endDate = new Date(y, m, 0);
    const end = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1
    ).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return { start, end };
  };

  const getNextPayslipId = (monthStr) => {
    const month = monthStr || monthFromDate();
    const prefix = month.replace("-", "");
    let maxSeq = 0;
    payslipsData.forEach((p) => {
      const match = String(p.payslipId || "").match(
        new RegExp(`^${prefix}-(\\d+)$`)
      );
      if (match) {
        const num = parseInt(match[1], 10);
        if (Number.isFinite(num)) {
          maxSeq = Math.max(maxSeq, num);
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(3, "0");
    return `${prefix}-${nextSeq}`;
  };

  const monthOptions = useMemo(() => {
    const set = new Set();
    payslipsData.forEach((p) => {
      const month = p.periodStart ? p.periodStart.slice(0, 7) : "";
      if (month) set.add(month);
    });
    return Array.from(set).sort().reverse();
  }, [payslipsData]);

  const filteredPayslips = useMemo(() => {
    if (!selectedMonth) return payslipsData;
    return payslipsData.filter((p) => {
      const startMonth = p.periodStart ? p.periodStart.slice(0, 7) : "";
      const endMonth = p.periodEnd ? p.periodEnd.slice(0, 7) : "";
      return startMonth === selectedMonth || endMonth === selectedMonth;
    });
  }, [payslipsData, selectedMonth]);

  const employeeIdsWithPayslipInMonth = useMemo(() => {
    const map = {};
    filteredPayslips.forEach((p) => {
      const key = String(p.employeeId ?? "");
      if (!map[key] || (p.periodStart || "") > (map[key].periodStart || "")) {
        map[key] = p;
      }
    });
    return new Set(Object.keys(map));
  }, [filteredPayslips]);

  const openPrintAllModal = () => {
    if (!selectedMonth) {
      showToast("يرجى اختيار الشهر أولاً", "error");
      return;
    }
    if (filteredPayslips.length === 0) {
      showToast("لا توجد كشوف في الشهر المحدد", "error");
      return;
    }
    setPrintAllLocation("");
    setPrintAllSelectedIds(new Set());
    setIsPrintAllModalOpen(true);
  };

  const PRINT_ALL_LOCATION_ALL = "all";

  const printAllEmployeesInLocation = useMemo(() => {
    if (!printAllLocation) return [];
    if (printAllLocation === PRINT_ALL_LOCATION_ALL) {
      return [...employees];
    }
    return employees.filter((e) => (e.location || "") === printAllLocation);
  }, [employees, printAllLocation]);

  useEffect(() => {
    if (printAllLocation && printAllEmployeesInLocation.length > 0) {
      setPrintAllSelectedIds(
        new Set(printAllEmployeesInLocation.map((e) => String(e.employeeId ?? "")))
      );
    } else if (printAllLocation) {
      setPrintAllSelectedIds(new Set());
    }
  }, [printAllLocation, printAllEmployeesInLocation]);

  const togglePrintAllEmployee = (employeeId) => {
    const id = String(employeeId ?? "");
    setPrintAllSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPrintAll = () => {
    setPrintAllSelectedIds(
      new Set(printAllEmployeesInLocation.map((e) => String(e.employeeId ?? "")))
    );
  };

  const deselectAllPrintAll = () => {
    setPrintAllSelectedIds(new Set());
  };

  const handlePrintAllFromModal = () => {
    if (!printAllLocation) {
      showToast("يرجى اختيار المكان", "error");
      return;
    }
    if (printAllSelectedIds.size === 0) {
      showToast("يرجى اختيار موظف واحد على الأقل", "error");
      return;
    }
    handlePrintAllMonthly({
      location: printAllLocation === PRINT_ALL_LOCATION_ALL ? undefined : printAllLocation,
      selectedIds: printAllSelectedIds,
    });
    setIsPrintAllModalOpen(false);
  };

  const prepareNewPayslip = () => {
    const month = selectedMonth || monthFromDate();
    const { start, end } = getMonthRange(month);
    setFormData({
      payslipId: getNextPayslipId(month),
      employeeId: "",
      periodStart: start,
      periodEnd: end,
      basicSalary: "",
      allowances: "",
      overtimeHours: "",
      overtimeRate: "",
      lateHours: "",
      earlyLeaveHours: "",
      penalties: "",
      rewards: "",
      insurance: "",
      deductions: [],
      netPay: "",
    });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const findDueInstallments = (employeeId, periodStart, periodEnd) => {
    const dueInstallments = [];
    const periodStartStr = (periodStart || "").slice(0, 10);
    const periodEndStr = (periodEnd || "").slice(0, 10);

    loansData.forEach((loan) => {
      if (loan.employeeId !== employeeId) return;

      const schedule = loan.schedule || [];
      const hasUnpaidSchedule = schedule.some((s) => !s.paid);

      if (schedule.length > 0 && hasUnpaidSchedule) {
        schedule.forEach((installment, idx) => {
          if (installment.paid) return;
          const dueDateStr = (installment.dueDate || "").slice(0, 10);
          if (
            dueDateStr &&
            dueDateStr >= periodStartStr &&
            dueDateStr <= periodEndStr
          ) {
            dueInstallments.push({
              type: `سلفة - ${loan.loanId}`,
              amount: parseFloat(installment.amount || 0),
              source: "erp_loans",
              loanId: loan.loanId,
              scheduleIndex: idx,
            });
          }
        });
      } else if (
        loan.repaymentType === "أقساط شهرية" &&
        (loan.installmentAmount || loan.installmentAmount === 0) &&
        parseFloat(loan.remainingAmount || 0) > 0
      ) {
        const installmentAmount = parseFloat(loan.installmentAmount || 0);
        const remainingAmount = parseFloat(loan.remainingAmount || 0);
        if (installmentAmount > 0) {
          dueInstallments.push({
            type: `سلفة - ${loan.loanId}`,
            amount: Math.min(installmentAmount, remainingAmount),
            source: "erp_loans",
            loanId: loan.loanId,
            scheduleIndex: undefined,
            noSchedule: true,
          });
        }
      }
    });

    return dueInstallments;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getAttendanceDays = (employeeId, periodStart, periodEnd) => {
    return attendanceData.filter(
      (record) =>
        record.employeeId === employeeId &&
        record.date >= periodStart &&
        record.date <= periodEnd &&
        record.present !== false
    ).length;
  };

  const getAbsentDays = (employeeId, periodStart, periodEnd) => {
    const totalDays =
      (new Date(periodEnd) - new Date(periodStart)) / (1000 * 60 * 60 * 24) + 1;
    const fridaysCount = getFridaysInPeriod(periodStart, periodEnd).length;
    const totalAttendanceDays = getAttendanceDays(employeeId, periodStart, periodEnd);
    const fridayAttendanceDays = getFridayAttendanceDays(employeeId, periodStart, periodEnd);
    const nonFridayAttendanceDays = totalAttendanceDays - fridayAttendanceDays;
    const workingDays = Math.max(0, totalDays - fridaysCount);
    return Math.max(0, workingDays - nonFridayAttendanceDays);
  };

  const getOvertimeHours = (employeeId, periodStart, periodEnd) => {
    const records = attendanceData.filter(
      (record) =>
        record.employeeId === employeeId &&
        record.date >= periodStart &&
        record.date <= periodEnd &&
        record.present !== false
    );

    return records.reduce((total, record) => {
      return total + (parseFloat(record.overtimeHours) || 0);
    }, 0);
  };

  const getLateHours = (employeeId, periodStart, periodEnd) => {
    const records = attendanceData.filter(
      (record) =>
        record.employeeId === employeeId &&
        record.date >= periodStart &&
        record.date <= periodEnd &&
        record.present !== false
    );

    return records.reduce((total, record) => {
      return total + (parseFloat(record.lateHours) || 0);
    }, 0);
  };

  const getEarlyLeaveHours = (employeeId, periodStart, periodEnd) => {
    const records = attendanceData.filter(
      (record) =>
        record.employeeId === employeeId &&
        record.date >= periodStart &&
        record.date <= periodEnd &&
        record.present !== false
    );

    return records.reduce((total, record) => {
      return total + (parseFloat(record.earlyLeaveHours) || 0);
    }, 0);
  };

  const getFridayAttendanceDetails = (employeeId, periodStart, periodEnd) => {
    const fridays = getFridaysInPeriod(periodStart, periodEnd);
    return fridays.filter((friday) => {
      const record = attendanceData.find(
        (r) =>
          r.employeeId === employeeId &&
          r.date === friday &&
          r.present !== false
      );
      return !!record;
    });
  };

  const getLateDetails = (employeeId, periodStart, periodEnd) => {
    return attendanceData
      .filter(
        (record) =>
          record.employeeId === employeeId &&
          record.date >= periodStart &&
          record.date <= periodEnd &&
          record.present !== false &&
          parseFloat(record.lateHours || 0) > 0
      )
      .map((record) => ({
        date: record.date,
        checkIn: record.checkIn,
        lateHours: parseFloat(record.lateHours || 0),
      }));
  };

  const getEarlyLeaveDetails = (employeeId, periodStart, periodEnd) => {
    return attendanceData
      .filter(
        (record) =>
          record.employeeId === employeeId &&
          record.date >= periodStart &&
          record.date <= periodEnd &&
          record.present !== false &&
          parseFloat(record.earlyLeaveHours || 0) > 0
      )
      .map((record) => ({
        date: record.date,
        checkOut: record.checkOut,
        earlyLeaveHours: parseFloat(record.earlyLeaveHours || 0),
      }));
  };

  const getDaysInPeriod = (periodStart, periodEnd) => {
    if (!periodStart || !periodEnd) return 30; // افتراضي 30 يوم
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 لتضمين اليوم الأول والأخير
    return diffDays;
  };

  const calculateOvertimeRate = (basicSalary, allowances, periodStart, periodEnd) => {
    // سعر الساعة الإضافية = (الراتب الأساسي + الحافز) ÷ عدد أيام الشهر الفعلية (حسب كل شهر) ÷ 8 ساعات
    const totalMonthly =
      parseFloat(basicSalary || 0) + parseFloat(allowances || 0);
    const startDate = new Date(periodStart || new Date());
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    const daysInMonth = getDaysInMonth(year, month);
    return totalMonthly / daysInMonth / 8;
  };

  const isFriday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 5; // 5 = Friday
  };

  const getFridaysInPeriod = (periodStart, periodEnd) => {
    const fridays = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const current = new Date(start);

    while (current <= end) {
      if (current.getDay() === 5) {
        // Friday
        const dateStr = current.toISOString().split("T")[0];
        fridays.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    return fridays;
  };

  const getFridayAttendanceDays = (employeeId, periodStart, periodEnd) => {
    const fridays = getFridaysInPeriod(periodStart, periodEnd);
    return fridays.filter((friday) => {
      const record = attendanceData.find(
        (r) =>
          r.employeeId === employeeId &&
          r.date === friday &&
          r.present !== false
      );
      return !!record;
    }).length;
  };

  const calculateSalaryBasedOnAttendance = (
    employeeId,
    periodStart,
    periodEnd,
    basicSalary
  ) => {
    // يجب أن نعيد الراتب الأساسي الكامل دائماً
    // لأن خصم الغياب يتم في الخصومات (deductions) وليس هنا
    return parseFloat(basicSalary) || 0;
  };

  const calculateNetPay = (
    basicSalary,
    allowances,
    deductions,
    employeeId,
    periodStart,
    periodEnd,
    overtimeHours,
    overtimeRate,
    lateHours,
    earlyLeaveHours,
    penalties,
    rewards,
    insurance
  ) => {
    // حساب الراتب بناءً على الحضور
    const salaryBasedOnAttendance = calculateSalaryBasedOnAttendance(
      employeeId,
      periodStart,
      periodEnd,
      basicSalary
    );

    const allow = parseFloat(allowances) || 0;
    const overtimeHrs = parseFloat(overtimeHours) || 0;
    const overtimeRt = parseFloat(overtimeRate) || 0;
    const overtimePay = parseFloat((overtimeHrs * overtimeRt).toFixed(2));
    
    // حساب خصم التأخير والانصراف المبكر
    const lateHrs = parseFloat(lateHours) || 0;
    const earlyLeaveHrs = parseFloat(earlyLeaveHours) || 0;
    const basicSalaryNum = parseFloat(basicSalary || 0);
    const allowancesNum = parseFloat(allowances || 0);
    const daysInPeriod = getDaysInPeriod(periodStart, periodEnd);
    const hourlyRate = (basicSalaryNum + allowancesNum) / daysInPeriod / 8; // سعر الساعة
    const lateDeduction = parseFloat((lateHrs * hourlyRate).toFixed(2)); // خصم التأخير (مقرب)
    const earlyLeaveDeduction = parseFloat((earlyLeaveHrs * hourlyRate).toFixed(2)); // خصم الانصراف المبكر (مقرب)
    
    const penaltiesAmount = parseFloat(penalties) || 0;
    const rewardsAmount = parseFloat(rewards) || 0;
    const insuranceAmount = parseFloat(insurance) || 0;
    const deduct = deductions.reduce(
      (sum, d) => sum + (parseFloat(d.amount) || 0),
      0
    );

    // حساب مكافأة حضور الجمعة
    const fridayAttendanceDays = getFridayAttendanceDays(
      employeeId,
      periodStart,
      periodEnd
    );
    const dailySalary = (basicSalaryNum + allowancesNum) / daysInPeriod;
    const fridayBonus =
      fridayAttendanceDays > 0 ? parseFloat((dailySalary * fridayAttendanceDays).toFixed(2)) : 0;

    // الصافي = الراتب + البدلات + الساعات الإضافية + المكافآت + مكافأة الجمعة - الخصومات - الجزاءات - التأمين - خصم التأخير - خصم الانصراف المبكر
    const netPay = 
      salaryBasedOnAttendance +
      allow +
      overtimePay +
      rewardsAmount +
      fridayBonus -
      deduct -
      penaltiesAmount -
      insuranceAmount -
      lateDeduction -
      earlyLeaveDeduction;
    
    return parseFloat(netPay.toFixed(2));
  };

  const resetForm = () => {
    setFormData({
      payslipId: "",
      employeeId: "",
      periodStart: "",
      periodEnd: "",
      basicSalary: "",
      allowances: "",
      overtimeHours: "",
      overtimeRate: "",
      lateHours: "",
      earlyLeaveHours: "",
      penalties: "",
      rewards: "",
      insurance: "",
      deductions: [],
      netPay: "",
    });
    setEditingItem(null);
  };

  useEffect(() => {
    if (
      formData.employeeId &&
      formData.periodStart &&
      formData.periodEnd &&
      !editingItem
    ) {
      const employee = employees.find(
        (emp) => emp.employeeId === formData.employeeId
      );
      if (employee) {
        const basicSalary = employee.salary || "";
        const fixedAllowance = employee.fixedAllowance || "";

        // حساب الساعات الإضافية من بيانات الحضور
        const totalOvertimeHours = getOvertimeHours(
          formData.employeeId,
          formData.periodStart,
          formData.periodEnd
        );

        // حساب ساعات التأخير من بيانات الحضور
        const totalLateHours = getLateHours(
          formData.employeeId,
          formData.periodStart,
          formData.periodEnd
        );

        // حساب ساعات الانصراف المبكر من بيانات الحضور
        const totalEarlyLeaveHours = getEarlyLeaveHours(
          formData.employeeId,
          formData.periodStart,
          formData.periodEnd
        );

        // حساب سعر الساعة الإضافية
        const overtimeRate = calculateOvertimeRate(
          basicSalary,
          fixedAllowance,
          formData.periodStart,
          formData.periodEnd
        );

        setFormData((prev) => ({
          ...prev,
          basicSalary: basicSalary,
          allowances: fixedAllowance || prev.allowances || "",
          overtimeHours:
            totalOvertimeHours > 0
              ? totalOvertimeHours.toFixed(1)
              : prev.overtimeHours || "",
          overtimeRate:
            overtimeRate > 0
              ? overtimeRate.toFixed(2)
              : prev.overtimeRate || "",
          lateHours:
            totalLateHours > 0
              ? totalLateHours.toFixed(1)
              : prev.lateHours || "",
          earlyLeaveHours:
            totalEarlyLeaveHours > 0
              ? totalEarlyLeaveHours.toFixed(1)
              : prev.earlyLeaveHours || "",
        }));
      }

      // إزالة جميع الخصومات التلقائية (السلف والغياب) لإعادة حسابها
      const manualDeductions = formData.deductions.filter(
        (d) => d.source === "manual"
      );

      // إضافة خصومات السلف
      const dueInstallments = findDueInstallments(
        formData.employeeId,
        formData.periodStart,
        formData.periodEnd
      );

      // حساب خصم أيام الغياب (مع استثناء أيام الجمعة)
      const startDate = new Date(formData.periodStart);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      const totalDaysInMonth = getDaysInMonth(year, month);

      // حساب أيام الجمعة في الفترة
      const fridaysInPeriod = getFridaysInPeriod(
        formData.periodStart,
        formData.periodEnd
      );
      const fridayAttendanceDays = getFridayAttendanceDays(
        formData.employeeId,
        formData.periodStart,
        formData.periodEnd
      );

      // حساب أيام الحضور (بما في ذلك الجمعة)
      const totalAttendanceDays = getAttendanceDays(
        formData.employeeId,
        formData.periodStart,
        formData.periodEnd
      );

      // الأيام القابلة للخصم = إجمالي الأيام - أيام الجمعة (لأن الجمعة إجازة)
      const workingDays = totalDaysInMonth - fridaysInPeriod.length;

      // أيام الحضور في الأيام العادية (غير الجمعة)
      const nonFridayAttendanceDays =
        totalAttendanceDays - fridayAttendanceDays;

      // أيام الغياب = الأيام القابلة للخصم - أيام الحضور في الأيام العادية
      const absentDays = Math.max(0, workingDays - nonFridayAttendanceDays);

      let absentDeduction = null;
      let fridayBonus = null;

      if (employee) {
        const basicSalary = parseFloat(
          formData.basicSalary || employee.salary || 0
        );
        const fixedAllowance = parseFloat(
          formData.allowances || employee.fixedAllowance || 0
        );
        const totalMonthlySalary = basicSalary + fixedAllowance;
        const daysInPeriod = getDaysInPeriod(formData.periodStart, formData.periodEnd);
        const dailySalary = totalMonthlySalary / daysInPeriod; // عدد الأيام الفعلية في الشهر

        // خصم الغياب (فقط للأيام غير الجمعة)
        if (absentDays > 0) {
          absentDeduction = {
            type: "خصم غياب",
            amount: (dailySalary * absentDays).toFixed(2),
            source: "attendance",
            attendanceDays: nonFridayAttendanceDays,
            totalDays: workingDays,
          };
        }

        // مكافأة الحضور يوم الجمعة (يوم عمل إضافي)
        if (fridayAttendanceDays > 0) {
          fridayBonus = {
            type: "مكافأة حضور الجمعة",
            amount: (dailySalary * fridayAttendanceDays).toFixed(2),
            source: "friday_attendance",
            fridayDays: fridayAttendanceDays,
          };
        }
      }

      // تجميع جميع الخصومات: اليدوية + السلف + الغياب
      const allDeductions = [
        ...manualDeductions,
        ...dueInstallments,
        ...(absentDeduction ? [absentDeduction] : []),
      ];

      // إضافة مكافأة حضور الجمعة كإضافة (ليست خصم)
      if (fridayBonus) {
        // نضيفها كخصم سالب (إضافة) أو نضيفها مباشرة في حساب الصافي
        // سنضيفها في calculateNetPay
      }

      setFormData((prev) => ({
        ...prev,
        deductions: allDeductions,
      }));
    }
  }, [
    formData.employeeId,
    formData.periodStart,
    formData.periodEnd,
    formData.basicSalary,
    formData.allowances,
    employees,
    loansData,
    attendanceData,
    editingItem,
  ]);

  useEffect(() => {
    const netPay = calculateNetPay(
      formData.basicSalary,
      formData.allowances,
      formData.deductions,
      formData.employeeId,
      formData.periodStart,
      formData.periodEnd,
      formData.overtimeHours,
      formData.overtimeRate,
      formData.lateHours,
      formData.earlyLeaveHours,
      formData.penalties,
      formData.rewards,
      formData.insurance
    );
    setFormData((prev) => ({ ...prev, netPay: netPay.toFixed(2) }));
  }, [
    formData.basicSalary,
    formData.allowances,
    formData.deductions,
    formData.employeeId,
    formData.periodStart,
    formData.periodEnd,
    formData.overtimeHours,
    formData.overtimeRate,
    formData.lateHours,
    formData.earlyLeaveHours,
    formData.penalties,
    formData.rewards,
    formData.insurance,
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.payslipId ||
      !formData.employeeId ||
      !formData.periodStart ||
      !formData.periodEnd
    ) {
      showToast("يرجى ملء جميع الحقول المطلوبة", "error");
      return;
    }

    const payslip = {
      payslipId: formData.payslipId,
      employeeId: formData.employeeId,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
      basicSalary: parseFloat(formData.basicSalary) || 0,
      allowances: parseFloat(formData.allowances) || 0,
      overtimeHours: parseFloat(formData.overtimeHours) || 0,
      overtimeRate: parseFloat(formData.overtimeRate) || 0,
      lateHours: parseFloat(formData.lateHours) || 0,
      earlyLeaveHours: parseFloat(formData.earlyLeaveHours) || 0,
      penalties: parseFloat(formData.penalties) || 0,
      rewards: parseFloat(formData.rewards) || 0,
      insurance: parseFloat(formData.insurance) || 0,
      deductions: formData.deductions,
      netPay: parseFloat(formData.netPay) || 0,
    };

    const applyLoanDeduction = (ded) => {
      if (ded.source !== "erp_loans" || !ded.loanId) return;
      const loan = loansData.find((l) => l.loanId === ded.loanId);
      if (!loan) return;
      const amount = parseFloat(ded.amount || 0);

      if (ded.noSchedule) {
        const newRemaining = Math.max(0, (loan.remainingAmount || 0) - amount);
        updateLoan(loan.loanId, { remainingAmount: newRemaining }, "loanId");
      } else if (loan.schedule && ded.scheduleIndex !== undefined) {
        const schedule = [...loan.schedule];
        if (schedule[ded.scheduleIndex] && !schedule[ded.scheduleIndex].paid) {
          schedule[ded.scheduleIndex].paid = true;
          const newRemaining = Math.max(0, (loan.remainingAmount || 0) - amount);
          updateLoan(
            loan.loanId,
            { schedule, remainingAmount: newRemaining },
            "loanId"
          );
        }
      }
    };

    const rollbackLoanDeduction = (ded) => {
      if (ded.source !== "erp_loans" || !ded.loanId) return;
      const loan = loansData.find((l) => l.loanId === ded.loanId);
      if (!loan) return;
      const amount = parseFloat(ded.amount || 0);

      if (ded.noSchedule) {
        const newRemaining = (loan.remainingAmount || 0) + amount;
        updateLoan(loan.loanId, { remainingAmount: newRemaining }, "loanId");
      } else if (loan.schedule && ded.scheduleIndex !== undefined) {
        const schedule = [...loan.schedule];
        if (schedule[ded.scheduleIndex]) {
          schedule[ded.scheduleIndex].paid = false;
          const newRemaining = (loan.remainingAmount || 0) + amount;
          updateLoan(
            loan.loanId,
            { schedule, remainingAmount: newRemaining },
            "loanId"
          );
        }
      }
    };

    if (editingItem) {
      if (editingItem.deductions) {
        editingItem.deductions.forEach(rollbackLoanDeduction);
      }
      payslip.deductions.forEach(applyLoanDeduction);
      updateItem(editingItem.payslipId, payslip, "payslipId");
      showToast("تم تحديث كشف الراتب بنجاح");
    } else {
      payslip.deductions.forEach(applyLoanDeduction);
      addItem(payslip);
      showToast("تم إنشاء كشف الراتب بنجاح");
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      payslipId: item.payslipId,
      employeeId: item.employeeId,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      basicSalary: item.basicSalary,
      allowances: item.allowances || "",
      overtimeHours: item.overtimeHours || "",
      overtimeRate: item.overtimeRate || "",
      lateHours: item.lateHours || "",
      earlyLeaveHours: item.earlyLeaveHours || "",
      penalties: item.penalties || "",
      rewards: item.rewards || "",
      insurance: item.insurance || "",
      deductions: item.deductions || [],
      netPay: item.netPay,
    });
    setIsModalOpen(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const rollbackLoanDeduction = (ded) => {
    if (ded.source !== "erp_loans" || !ded.loanId) return;
    const loan = loansData.find((l) => l.loanId === ded.loanId);
    if (!loan) return;
    const amount = parseFloat(ded.amount || 0);

    if (ded.noSchedule) {
      const newRemaining = (loan.remainingAmount || 0) + amount;
      updateLoan(loan.loanId, { remainingAmount: newRemaining }, "loanId");
    } else if (loan.schedule && ded.scheduleIndex !== undefined) {
      const schedule = [...loan.schedule];
      if (schedule[ded.scheduleIndex]) {
        schedule[ded.scheduleIndex].paid = false;
        const newRemaining = (loan.remainingAmount || 0) + amount;
        updateLoan(
          loan.loanId,
          { schedule, remainingAmount: newRemaining },
          "loanId"
        );
      }
    }
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.deductions) {
        itemToDelete.deductions.forEach(rollbackLoanDeduction);
      }
      deleteItem(itemToDelete.payslipId, "payslipId");
      showToast("تم حذف كشف الراتب بنجاح");
      setItemToDelete(null);
    }
  };

  const handleExport = () => {
    if (payslipsData.length === 0) {
      showToast("لا توجد بيانات للتصدير", "error");
      return;
    }
    const exportData = payslipsData.map((payslip) => ({
      ...payslip,
      deductionsJson: JSON.stringify(payslip.deductions || []),
    }));
    exportToExcel(exportData, "payslips", "erp_export_payslips.xlsx");
    showToast("تم تصدير البيانات بنجاح");
  };

  const handleImport = (importedData, mode) => {
    try {
      const processedData = importedData.map((item) => {
        const deductions = item.deductionsJson
          ? JSON.parse(item.deductionsJson)
          : [];
        return {
          payslipId: item.payslipId || item["payslipId"],
          employeeId: item.employeeId || item["employeeId"],
          periodStart: item.periodStart || item["periodStart"],
          periodEnd: item.periodEnd || item["periodEnd"],
          basicSalary: parseFloat(item.basicSalary || item["basicSalary"] || 0),
          allowances: parseFloat(item.allowances || item["allowances"] || 0),
          overtimeHours: parseFloat(
            item.overtimeHours || item["overtimeHours"] || 0
          ),
          overtimeRate: parseFloat(
            item.overtimeRate || item["overtimeRate"] || 0
          ),
          penalties: parseFloat(item.penalties || item["penalties"] || 0),
          rewards: parseFloat(item.rewards || item["rewards"] || 0),
          insurance: parseFloat(item.insurance || item["insurance"] || 0),
          deductions: deductions,
          netPay: parseFloat(item.netPay || item["netPay"] || 0),
        };
      });

      if (mode === "replace") {
        replaceAll(processedData);
        showToast("تم استبدال البيانات بنجاح");
      } else if (mode === "merge") {
        processedData.forEach((item) => {
          const existing = payslipsData.find(
            (p) => p.payslipId === item.payslipId
          );
          if (existing) {
            updateItem(item.payslipId, item, "payslipId");
          } else {
            addItem(item);
          }
        });
        showToast("تم دمج البيانات بنجاح");
      }
      setIsImportModalOpen(false);
    } catch (error) {
      showToast("خطأ في استيراد البيانات", "error");
    }
  };

  const imageToBase64 = (src) => {
    return new Promise((resolve) => {
      // استخدام fetch لتحميل الصورة وتحويلها إلى base64
      fetch(src)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => {
            // في حالة الفشل، جرب استخدام Image
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              } catch (error) {
                resolve("");
              }
            };
            img.onerror = () => resolve("");
            img.src = src;
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          // في حالة الفشل، جرب استخدام Image
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/png"));
            } catch (error) {
              resolve("");
            }
          };
          img.onerror = () => resolve("");
          img.src = src;
        });
    });
  };

  const handlePrint = async (item) => {
    const printWindow = window.open("", "_blank");
    const employee = employees.find(
      (emp) => emp.employeeId === item.employeeId
    );

    const logoBase64 = await imageToBase64(logoImage);
    const now = new Date();
    const dateTime = now.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشف راتب - ${item.payslipId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; position: relative; }
          .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .date-time { font-size: 14px; color: #333; }
          .logo { max-width: 150px; max-height: 80px; object-fit: contain; }
          .header { text-align: center; margin-bottom: 20px; }
          h1 { text-align: center; margin: 0; }
          .metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 20px 0; }
          .metric { padding: 10px; border: 1px solid #000; border-radius: 6px; background: #f9f9f9; }
          .netpay-table { width: 100%; margin: 16px auto; border-collapse: collapse; }
          .netpay-table th, .netpay-table td { border: 1px solid #000; padding: 10px; text-align: center; font-size: 16px; }
          .netpay-table th { background-color: #f2f2f2; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; gap: 40px; }
          .signature-block { width: 220px; text-align: center; }
          .signature-line { margin-top: 40px; border-top: 2px solid #000; width: 100%; }
        </style>
        </head>
        <body>
          <div class="top-bar">
            <div class="date-time">${dateTime}</div>
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : "<div></div>"}
          </div>
          <div class="header">
            <h1>كشف راتب</h1>
          </div>
       
          <div style="display: flex; justify-content: space-between; gap: 16px; margin: 8px 0;">
            <p style="margin: 0;"><strong>الموظف:</strong> ${
              employee ? employee.name : item.employeeId
            }</p>
            <p style="margin: 0;"><strong>الفترة:</strong> ${item.periodStart} إلى ${
        item.periodEnd
      }</p>
          </div>
       

          <div class="metrics-grid">
            <div class="metric"><strong>المرتب الأساسي:</strong> ${item.basicSalary} ج.م</div>
            <div class="metric"><strong>الحوافز:</strong> ${item.allowances || 0} ج.م</div>
            ${
              item.overtimeHours > 0
                ? `<div class="metric"><strong>الساعات الإضافية:</strong> ${item.overtimeHours} × ${
                    item.overtimeRate || 0
                  } = ${(item.overtimeHours * (item.overtimeRate || 0)).toFixed(
                    2
                  )} ج.م</div>`
                : ""
            }
            ${
              item.rewards > 0
                ? `<div class="metric"><strong>مكافآت:</strong> ${item.rewards} ج.م</div>`
                : ""
            }
            ${(() => {
              const absentDays = getAbsentDays(item.employeeId, item.periodStart, item.periodEnd);
              const basicSalary = parseFloat(item.basicSalary || 0);
              const fixedAllowance = parseFloat(item.allowances || 0);
              const daysInPeriod = getDaysInPeriod(item.periodStart, item.periodEnd);
              const dailySalary = (basicSalary + fixedAllowance) / daysInPeriod;
              const absenceDeduction = absentDays > 0 ? dailySalary * absentDays : 0;
              return absentDays > 0
                ? `<div class="metric"><strong>أيام الغياب:</strong> ${absentDays} يوم (-${absenceDeduction.toFixed(2)} ج.م)</div>`
                : `<div class="metric"><strong>أيام الغياب:</strong> 0 يوم</div>`;
            })()}
            ${(() => {
              const basicSalary = parseFloat(item.basicSalary || 0);
              const fixedAllowance = parseFloat(item.allowances || 0);
              const daysInPeriod = getDaysInPeriod(item.periodStart, item.periodEnd);
              const hourlyRate = (basicSalary + fixedAllowance) / daysInPeriod / 8;
              const lateHrs = parseFloat(item.lateHours || 0);
              const earlyLeaveHrs = parseFloat(item.earlyLeaveHours || 0);
              const lateDeduction = lateHrs * hourlyRate;
              const earlyLeaveDeduction = earlyLeaveHrs * hourlyRate;
              
              // حساب مكافأة حضور الجمعة
              const fridayAttendanceDays = getFridayAttendanceDays(
                item.employeeId,
                item.periodStart,
                item.periodEnd
              );
              const dailySalary = (basicSalary + fixedAllowance) / daysInPeriod;
              const fridayBonus = fridayAttendanceDays > 0 ? dailySalary * fridayAttendanceDays : 0;
              
              // حساب إجمالي السلف
              const loansTotal = item.deductions
                .filter((d) => d.source === "erp_loans")
                .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
              
              let result = "";
              if (loansTotal > 0) {
                result += `<div class="metric"><strong>السلف:</strong> -${loansTotal.toFixed(2)} ج.م</div>`;
              }
              if (lateHrs > 0) {
                result += `<div class="metric"><strong>خصم التأخير:</strong> ${lateHrs} ساعة × ${hourlyRate.toFixed(2)} = -${lateDeduction.toFixed(2)} ج.م</div>`;
              }
              if (earlyLeaveHrs > 0) {
                result += `<div class="metric"><strong>خصم الانصراف المبكر:</strong> ${earlyLeaveHrs} ساعة × ${hourlyRate.toFixed(2)} = -${earlyLeaveDeduction.toFixed(2)} ج.م</div>`;
              }
              if (item.penalties > 0) {
                result += `<div class="metric"><strong>جزاءات:</strong> -${item.penalties} ج.م</div>`;
              }
              if (item.insurance > 0) {
                result += `<div class="metric"><strong>تأمين:</strong> -${item.insurance} ج.م</div>`;
              }
              if (fridayAttendanceDays > 0) {
                result += `<div class="metric"><strong>مكافأة حضور الجمعة:</strong> ${fridayAttendanceDays} يوم × ${dailySalary.toFixed(2)} = +${fridayBonus.toFixed(2)} ج.م</div>`;
              }
              return result;
            })()}
          </div>
          ${(() => {
            // إعادة حساب الصافي بدقة
            const basicSalary = parseFloat(item.basicSalary || 0);
            const allowances = parseFloat(item.allowances || 0);
            const overtimeHrs = parseFloat(item.overtimeHours || 0);
            const overtimeRt = parseFloat(item.overtimeRate || 0);
            const overtimePay = parseFloat((overtimeHrs * overtimeRt).toFixed(2));
            const rewards = parseFloat(item.rewards || 0);
            const penalties = parseFloat(item.penalties || 0);
            const insurance = parseFloat(item.insurance || 0);
            
            // حساب الخصومات (السلف + الغياب)
            const loansTotal = item.deductions
              .filter((d) => d.source === "erp_loans")
              .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            const absenceTotal = item.deductions
              .filter((d) => !d.source || d.source !== "erp_loans")
              .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
            const totalDeductions = loansTotal + absenceTotal;
            
            // حساب خصم التأخير والانصراف المبكر
            const daysInPeriod = getDaysInPeriod(item.periodStart, item.periodEnd);
            const hourlyRate = (basicSalary + allowances) / daysInPeriod / 8;
            const lateHrs = parseFloat(item.lateHours || 0);
            const earlyLeaveHrs = parseFloat(item.earlyLeaveHours || 0);
            const lateDeduction = parseFloat((lateHrs * hourlyRate).toFixed(2));
            const earlyLeaveDeduction = parseFloat((earlyLeaveHrs * hourlyRate).toFixed(2));
            
            // حساب مكافأة حضور الجمعة
            const fridayAttendanceDays = getFridayAttendanceDays(
              item.employeeId,
              item.periodStart,
              item.periodEnd
            );
            const dailySalary = (basicSalary + allowances) / daysInPeriod;
            const fridayBonus = fridayAttendanceDays > 0 ? parseFloat((dailySalary * fridayAttendanceDays).toFixed(2)) : 0;
            
            // حساب الصافي بدقة
            const calculatedNetPay = 
              basicSalary +
              allowances +
              overtimePay +
              rewards +
              fridayBonus -
              totalDeductions -
              penalties -
              insurance -
              lateDeduction -
              earlyLeaveDeduction;
            
            return `
              <table class="netpay-table">
                <thead>
                  <tr>
                    <th>الصافي</th>
                    <td><strong>${parseFloat(calculatedNetPay.toFixed(2)).toFixed(2)} ج.م</strong></td>
                  </tr>
                </thead>
              </table>
            `;
          })()}
          <div class="signatures">
            <div class="signature-block">
              <strong>توقيع المحاسب</strong>
              <div class="signature-line"></div>
            </div>
            <div class="signature-block">
              <strong>توقيع الموظف</strong>
              <div class="signature-line"></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintAllMonthly = async (options = {}) => {
    const { location: locationFilter, selectedIds: selectedEmployeeIds } = options;
    const list = filteredPayslips;
    if (!list || list.length === 0) {
      showToast("لا توجد كشوف في الشهر المحدد", "error");
      return;
    }

    // اختر كشف واحد لكل موظف في الشهر (الأحدث حسب periodStart)
    const perEmployee = {};
    list.forEach((item) => {
      const key = item.employeeId;
      const current = perEmployee[key];
      if (!current || (item.periodStart || "") > (current.periodStart || "")) {
        perEmployee[key] = item;
      }
    });

    let perEmployeeList = Object.values(perEmployee);
    if (locationFilter) {
      perEmployeeList = perEmployeeList.filter((item) => {
        const emp = employees.find((e) => e.employeeId === item.employeeId);
        return emp && (emp.location || "") === locationFilter;
      });
    }
    if (selectedEmployeeIds && selectedEmployeeIds.size > 0) {
      perEmployeeList = perEmployeeList.filter((item) =>
        selectedEmployeeIds.has(String(item.employeeId ?? ""))
      );
    }
    if (perEmployeeList.length === 0) {
      showToast(
        locationFilter
          ? "لا توجد كشوف للموظفين المحددين في هذا المكان"
          : "لا توجد كشوف في الشهر المحدد",
        "error"
      );
      return;
    }
    const totalNet = perEmployeeList.reduce(
      (sum, item) => sum + (parseFloat(item.netPay) || 0),
      0
    );
    const totals = perEmployeeList.reduce(
      (acc, item) => {
        const basic = parseFloat(item.basicSalary || 0);
        const allow = parseFloat(item.allowances || 0);
        const overtimePay =
          (parseFloat(item.overtimeHours || 0) || 0) *
          (parseFloat(item.overtimeRate || 0) || 0);
        const rewards = parseFloat(item.rewards || 0);
        const fridayDays = getFridayAttendanceDays(
          item.employeeId,
          item.periodStart,
          item.periodEnd
        );
        const daysInPeriod = getDaysInPeriod(item.periodStart, item.periodEnd);
        const fridayBonus = ((basic + allow) / daysInPeriod) * fridayDays;
        const hourlyRate = (basic + allow) / daysInPeriod / 8;
        const lateHrs = parseFloat(item.lateHours || 0);
        const earlyLeaveHrs = parseFloat(item.earlyLeaveHours || 0);
        const lateDeduction = lateHrs * hourlyRate;
        const earlyLeaveDeduction = earlyLeaveHrs * hourlyRate;
        const extraNet = overtimePay + fridayBonus - lateDeduction - earlyLeaveDeduction;
        const loanDeductions = item.deductions
          .filter((d) => d.source === "erp_loans")
          .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const absenceDeductions = item.deductions
          .filter((d) => (d.type || "").includes("غياب"))
          .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const penalties = parseFloat(item.penalties || 0);
        const insurance = parseFloat(item.insurance || 0);

        acc.totalLoans += loanDeductions;
        acc.totalBaseAllow += basic + allow;
        acc.totalRewards += rewards + extraNet;
        acc.totalDeductions += absenceDeductions + penalties + insurance;
        return acc;
      },
      { totalLoans: 0, totalBaseAllow: 0, totalRewards: 0, totalDeductions: 0 }
    );

    const rows = perEmployeeList.map((item) => {
      const employee = employees.find(
        (emp) => emp.employeeId === item.employeeId
      );
      const loanDeductions = item.deductions
        .filter((d) => d.source === "erp_loans")
        .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
      const overtimePay =
        (parseFloat(item.overtimeHours || 0) || 0) *
        (parseFloat(item.overtimeRate || 0) || 0);
      const fridayAttendanceDays = getFridayAttendanceDays(
        item.employeeId,
        item.periodStart,
        item.periodEnd
      );
      const daysInPeriod = getDaysInPeriod(item.periodStart, item.periodEnd);
      const basicSalary = parseFloat(item.basicSalary || 0);
      const allowances = parseFloat(item.allowances || 0);
      const dailySalary = (basicSalary + allowances) / daysInPeriod;
      const hourlyRate = (basicSalary + allowances) / daysInPeriod / 8;
      const fridayBonus = fridayAttendanceDays > 0 ? dailySalary * fridayAttendanceDays : 0;
      const lateHrs = parseFloat(item.lateHours || 0);
      const earlyLeaveHrs = parseFloat(item.earlyLeaveHours || 0);
      const lateDeduction = lateHrs * hourlyRate;
      const earlyLeaveDeduction = earlyLeaveHrs * hourlyRate;
      const extraTotal = overtimePay + fridayBonus - lateDeduction - earlyLeaveDeduction;

      const absentDays = getAbsentDays(
        item.employeeId,
        item.periodStart,
        item.periodEnd
      );
      const absenceDeductionAmount = absentDays > 0
        ? dailySalary * absentDays
        : 0;
      const absenceDisplay = `${absentDays} يوم${absenceDeductionAmount > 0 ? ` (-${absenceDeductionAmount.toFixed(2)} ج.م)` : ""}`;

      return `
        <tr>
          <td>${employee ? employee.name : item.employeeId}</td>
          <td>${item.basicSalary}</td>
          <td>${item.allowances || 0}</td>
          <td>${extraTotal.toFixed(2)}</td>
          <td>${item.rewards || 0}</td>
          <td>${loanDeductions.toFixed(2)}</td>
          <td>${item.penalties || 0}</td>
          <td>${item.insurance || 0}</td>
          <td>${absenceDisplay}</td>
          <td><strong>${item.netPay}</strong></td>
        </tr>
      `;
    });

    const logoBase64 = await imageToBase64(logoImage);
    const now = new Date();
    const dateTime = now.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>كشوف الرواتب - ${selectedMonth || "الكل"}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; position: relative; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .date-time { font-size: 14px; color: #333; }
            .logo { max-width: 150px; max-height: 80px; object-fit: contain; }
            .header { text-align: center; margin-bottom: 20px; }
            h1 { text-align: center; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; gap: 40px; }
            .signature-block { width: 220px; text-align: center; }
            .signature-line { margin-top: 40px; border-top: 2px solid #000; width: 100%; }
          </style>
        </head>
        <body>
          <div class="top-bar">
            <div class="date-time">${dateTime}</div>
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : "<div></div>"}
          </div>
          <div class="header">
            <h1>كشوف الرواتب - ${selectedMonth || "كل الشهور"}</h1>
          </div>
          <table>
            <thead>
              <tr>
                <th>الموظف</th>
                <th>الأساسي</th>
                <th>الحوافز</th>
                <th>إضافي</th>
                <th>مكافآت</th>
                <th>سلف</th>
                <th>جزاءات</th>
                <th>تأمين</th>
                <th>أيام الغياب</th>
                <th>الصافي</th>
              </tr>
            </thead>
            <tbody>
              ${rows.join("")}
            </tbody>
          </table>
        
          <table>
          <tfoot>
          <tr>
          <th colspan="9" style="text-align:center">اجمالي المرتبات (أساسي + بدلات)</th>
          <th style="text-align:center">${totals.totalBaseAllow.toFixed(2)} ج.م</th>
          </tr>
          <tr>
          <th colspan="9" style="text-align:center">اجمالي المكافآت (مكافآت + جمعة + إضافي)</th>
          <th style="text-align:center">${totals.totalRewards.toFixed(2)} ج.م</th>
          </tr>
          <tr>
          <th colspan="9" style="text-align:center">اجمالي السلف</th>
          <th style="text-align:center">${totals.totalLoans.toFixed(2)} ج.م</th>
          </tr>
         
          <tr>
          <th colspan="9" style="text-align:center">اجمالي الخصومات (غياب + جزاءات + تأمين)</th>
          <th style="text-align:center">${totals.totalDeductions.toFixed(2)} ج.م</th>
          </tr>
           <tr>
          <th colspan="9" style="text-align:center">اجمالي الصافي</th>
          <th style="text-align:center">${totalNet.toFixed(2)} ج.م</th>
          </tr>
          </tfoot>
          </table>
          <div class="signatures">
            <div class="signature-block">
              <strong>توقيع المحاسب</strong>
              <div class="signature-line"></div>
            </div>
            <div class="signature-block">
              <strong>توقيع المدير</strong>
              <div class="signature-line"></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find((emp) => emp.employeeId === employeeId);
    return employee ? employee.name : employeeId;
  };

  const addManualDeduction = () => {
    setFormData((prev) => ({
      ...prev,
      deductions: [
        ...prev.deductions,
        { type: "", amount: "", source: "manual" },
      ],
    }));
  };

  const removeDeduction = (index) => {
    setFormData((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index),
    }));
  };

  const updateDeduction = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      deductions: prev.deductions.map((ded, i) =>
        i === index ? { ...ded, [field]: value } : ded
      ),
    }));
  };

  const columns = [
    { key: "payslipId", label: "معرف الكشف" },
    {
      key: "employeeId",
      label: "الموظف",
      render: (val) => getEmployeeName(val),
    },
    { key: "periodStart", label: "بداية الفترة" },
    { key: "periodEnd", label: "نهاية الفترة" },
    {
      key: "basicSalary",
      label: "المرتب الأساسي",
      render: (val) => `${val} ج.م`,
    },
    { key: "netPay", label: "الصافي", render: (val) => `${val} ج.م` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">كشف الرواتب</h2>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">شهر:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">الكل</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {permissions.view && (
            <>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                تصدير Excel
              </button>
              <button
                onClick={openPrintAllModal}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                طباعة الكل (الشهر)
              </button>
            </>
          )}
          {permissions.create && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                استيراد Excel
              </button>
              <button
                onClick={prepareNewPayslip}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                إنشاء كشف راتب جديد
              </button>
            </>
          )}
        </div>
      </div>

      {!permissions.view && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          ليس لديك صلاحية لعرض هذه الصفحة
        </div>
      )}

      {permissions.view && (
        <DataTable
          data={filteredPayslips}
          columns={columns}
          onView={handleView}
          onEdit={permissions.edit ? handleEdit : null}
          onDelete={permissions.delete ? handleDelete : null}
          searchFields={["payslipId", "employeeId"]}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingItem ? "تعديل كشف راتب" : "إنشاء كشف راتب جديد"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                معرف الكشف <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.payslipId}
                onChange={(e) =>
                  setFormData({ ...formData, payslipId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
                disabled={!!editingItem}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الموظف <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">اختر موظف</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                بداية الفترة <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.periodStart}
                onChange={(e) =>
                  setFormData({ ...formData, periodStart: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نهاية الفترة <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.periodEnd}
                onChange={(e) =>
                  setFormData({ ...formData, periodEnd: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المرتب الأساسي
              </label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) =>
                  setFormData({ ...formData, basicSalary: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحوافز
              </label>
              <input
                type="number"
                value={formData.allowances}
                onChange={(e) =>
                  setFormData({ ...formData, allowances: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ساعات إضافية (محسوبة تلقائياً من الحضور)
              </label>
              <input
                type="number"
                value={formData.overtimeHours}
                onChange={(e) =>
                  setFormData({ ...formData, overtimeHours: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                min="0"
                step="0.1"
                readOnly
                title="يتم حسابها تلقائياً من أوقات الحضور والانصراف (أي ساعات خارج 9 صباحاً - 5 مساءاً)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سعر الساعة الإضافية (محسوب تلقائياً)
              </label>
              <input
                type="number"
                value={formData.overtimeRate}
                onChange={(e) =>
                  setFormData({ ...formData, overtimeRate: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                min="0"
                step="0.01"
                readOnly
                title="يتم حسابه تلقائياً: (الراتب الأساسي + الحافز) ÷ عدد أيام الشهر الفعلي ÷ 8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ساعات التأخير (محسوبة تلقائياً من الحضور)
              </label>
              <input
                type="number"
                value={formData.lateHours}
                onChange={(e) =>
                  setFormData({ ...formData, lateHours: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                min="0"
                step="0.1"
                readOnly
                title="يتم حسابها تلقائياً من أوقات الحضور (أي تأخير بعد الساعة 9 صباحاً)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ساعات الانصراف المبكر (محسوبة تلقائياً من الحضور)
              </label>
              <input
                type="number"
                value={formData.earlyLeaveHours}
                onChange={(e) =>
                  setFormData({ ...formData, earlyLeaveHours: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                min="0"
                step="0.1"
                readOnly
                title="يتم حسابها تلقائياً من أوقات الانصراف (أي انصراف قبل الساعة 5 مساءاً)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مكافآت
              </label>
              <input
                type="number"
                value={formData.rewards}
                onChange={(e) =>
                  setFormData({ ...formData, rewards: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                جزاءات
              </label>
              <input
                type="number"
                value={formData.penalties}
                onChange={(e) =>
                  setFormData({ ...formData, penalties: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تأمين
              </label>
              <input
                type="number"
                value={formData.insurance}
                onChange={(e) =>
                  setFormData({ ...formData, insurance: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
          </div>

          {formData.employeeId &&
            formData.periodStart &&
            formData.periodEnd && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  معلومات الحضور:
                </h4>
                {(() => {
                  const totalAttendanceDays = getAttendanceDays(
                    formData.employeeId,
                    formData.periodStart,
                    formData.periodEnd
                  );
                  const startDate = new Date(formData.periodStart);
                  const year = startDate.getFullYear();
                  const month = startDate.getMonth() + 1;
                  const totalDaysInMonth = getDaysInMonth(year, month);

                  const fridaysInPeriod = getFridaysInPeriod(
                    formData.periodStart,
                    formData.periodEnd
                  );
                  const fridayAttendanceDays = getFridayAttendanceDays(
                    formData.employeeId,
                    formData.periodStart,
                    formData.periodEnd
                  );
                  const workingDays = totalDaysInMonth - fridaysInPeriod.length;
                  const nonFridayAttendanceDays =
                    totalAttendanceDays - fridayAttendanceDays;
                  const absentDays = Math.max(
                    0,
                    workingDays - nonFridayAttendanceDays
                  );

                  const employee = employees.find(
                    (emp) => emp.employeeId === formData.employeeId
                  );
                  const basicSalary = parseFloat(
                    formData.basicSalary || employee?.salary || 0
                  );
                  const fixedAllowance = parseFloat(
                    formData.allowances || employee?.fixedAllowance || 0
                  );
                  const totalMonthlySalary = basicSalary + fixedAllowance;
                  const daysInPeriod = getDaysInPeriod(formData.periodStart, formData.periodEnd);
                  const dailySalary = totalMonthlySalary / daysInPeriod;
                  const absentDeductionAmount =
                    absentDays > 0 ? (dailySalary * absentDays).toFixed(2) : 0;
                  const fridayBonusAmount =
                    fridayAttendanceDays > 0
                      ? (dailySalary * fridayAttendanceDays).toFixed(2)
                      : 0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">
                            إجمالي أيام الشهر:
                          </span>
                          <span className="font-semibold text-gray-800 mr-2 block">
                            {totalDaysInMonth} يوم
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            أيام الجمعة (إجازة):
                          </span>
                          <span className="font-semibold text-blue-600 mr-2 block">
                            {fridaysInPeriod.length} يوم
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            أيام الحضور (غير الجمعة):
                          </span>
                          <span className="font-semibold text-emerald-600 mr-2 block">
                            {nonFridayAttendanceDays} يوم
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">
                            أيام الغياب (قابلة للخصم):
                          </span>
                          <span className="font-semibold text-rose-600 mr-2 block">
                            {absentDays} يوم
                          </span>
                        </div>
                        {fridayAttendanceDays > 0 && (
                          <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-600">
                              حضور أيام الجمعة (مكافأة):
                            </span>
                            <span className="font-semibold text-emerald-600 mr-2">
                              {fridayAttendanceDays} يوم
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="bg-white rounded p-3 border border-gray-200">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            الراتب الشهري: (الراتب الأساسي {basicSalary} +
                            الحافز {fixedAllowance}) ={" "}
                            {totalMonthlySalary.toFixed(2)} ج.م
                          </div>
                          <div>
                            الراتب اليومي: {totalMonthlySalary.toFixed(2)} ÷ {getDaysInPeriod(formData.periodStart, formData.periodEnd)}
                            = {dailySalary.toFixed(2)} ج.م
                          </div>
                          {absentDays > 0 && (
                            <div className="font-semibold text-rose-600">
                              خصم الغياب (أيام غير الجمعة):{" "}
                              {dailySalary.toFixed(2)} × {absentDays} ={" "}
                              {absentDeductionAmount} ج.م
                            </div>
                          )}
                          {fridayAttendanceDays > 0 && (
                            <div className="font-semibold text-emerald-600">
                              مكافأة حضور الجمعة: {dailySalary.toFixed(2)} ×{" "}
                              {fridayAttendanceDays} = {fridayBonusAmount} ج.م
                            </div>
                          )}
                          {(() => {
                            const totalOvertime = getOvertimeHours(
                              formData.employeeId,
                              formData.periodStart,
                              formData.periodEnd
                            );
                            const overtimeRate = calculateOvertimeRate(
                              basicSalary,
                              fixedAllowance
                            );
                            if (totalOvertime > 0) {
                              return (
                                <div className="font-semibold text-emerald-600">
                                  الساعات الإضافية: {totalOvertime.toFixed(1)}{" "}
                                  ساعة × {overtimeRate.toFixed(2)} (الراتب ÷ {getDaysInPeriod(formData.periodStart, formData.periodEnd)}
                                  ÷ 8) ={" "}
                                  {(totalOvertime * overtimeRate).toFixed(2)}{" "}
                                  ج.م
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">الخصومات</h3>
              <button
                type="button"
                onClick={addManualDeduction}
                className="px-3 py-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200 text-sm"
              >
                إضافة خصم يدوي
              </button>
            </div>
            <div className="space-y-2">
              {formData.deductions.map((ded, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center p-2 bg-gray-50 rounded"
                >
                  <input
                    type="text"
                    value={ded.type}
                    onChange={(e) =>
                      updateDeduction(index, "type", e.target.value)
                    }
                    placeholder="نوع الخصم"
                    className="flex-1 px-3 py-1 border border-gray-300 rounded"
                    disabled={ded.source === "erp_loans"}
                  />
                  <input
                    type="number"
                    value={ded.amount}
                    onChange={(e) =>
                      updateDeduction(index, "amount", e.target.value)
                    }
                    placeholder="المبلغ"
                    className="w-32 px-3 py-1 border border-gray-300 rounded"
                    min="0"
                    step="0.01"
                    disabled={ded.source === "erp_loans"}
                  />
                  {ded.source !== "erp_loans" && (
                    <button
                      type="button"
                      onClick={() => removeDeduction(index)}
                      className="px-2 py-1 bg-rose-500 text-white rounded text-sm"
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}
              {formData.deductions.length === 0 && (
                <p className="text-gray-500 text-sm">لا توجد خصومات</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-800 mb-2">ملخص الحساب:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">الراتب الأساسي:</span>
                  <span className="font-semibold">
                    {parseFloat(formData.basicSalary || 0).toFixed(2)} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الحوافز:</span>
                  <span className="font-semibold text-emerald-600">
                    +{parseFloat(formData.allowances || 0).toFixed(2)} ج.م
                  </span>
                </div>
                {parseFloat(formData.overtimeHours || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      الساعات الإضافية ({formData.overtimeHours} ×{" "}
                      {formData.overtimeRate || 0}):
                    </span>
                    <span className="font-semibold text-emerald-600">
                      +
                      {(
                        parseFloat(formData.overtimeHours || 0) *
                        parseFloat(formData.overtimeRate || 0)
                      ).toFixed(2)}{" "}
                      ج.م
                    </span>
                  </div>
                )}
                {(() => {
                  const basicSalary = parseFloat(formData.basicSalary || 0);
                  const fixedAllowance = parseFloat(formData.allowances || 0);
                  const daysInPeriod = getDaysInPeriod(formData.periodStart, formData.periodEnd);
                  const hourlyRate = (basicSalary + fixedAllowance) / daysInPeriod / 8;
                  const lateHrs = parseFloat(formData.lateHours || 0);
                  const earlyLeaveHrs = parseFloat(formData.earlyLeaveHours || 0);
                  const lateDeduction = lateHrs * hourlyRate;
                  const earlyLeaveDeduction = earlyLeaveHrs * hourlyRate;
                  
                  return (
                    <>
                      {lateHrs > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            خصم التأخير ({lateHrs} ساعة):
                          </span>
                          <span className="font-semibold text-red-600">
                            -{lateDeduction.toFixed(2)} ج.م
                          </span>
                        </div>
                      )}
                      {earlyLeaveHrs > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            خصم الانصراف المبكر ({earlyLeaveHrs} ساعة):
                          </span>
                          <span className="font-semibold text-red-600">
                            -{earlyLeaveDeduction.toFixed(2)} ج.م
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                {parseFloat(formData.rewards || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">مكافآت:</span>
                    <span className="font-semibold text-emerald-600">
                      +{parseFloat(formData.rewards || 0).toFixed(2)} ج.م
                    </span>
                  </div>
                )}
                {(() => {
                  const fridayAttendanceDays = getFridayAttendanceDays(
                    formData.employeeId,
                    formData.periodStart,
                    formData.periodEnd
                  );
                  const basicSalary = parseFloat(formData.basicSalary || 0);
                  const fixedAllowance = parseFloat(formData.allowances || 0);
                  const daysInPeriod = getDaysInPeriod(formData.periodStart, formData.periodEnd);
                  const dailySalary = (basicSalary + fixedAllowance) / daysInPeriod;
                  const fridayBonus =
                    fridayAttendanceDays > 0
                      ? dailySalary * fridayAttendanceDays
                      : 0;
                  if (fridayBonus > 0) {
                    return (
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          مكافأة حضور الجمعة ({fridayAttendanceDays} يوم):
                        </span>
                        <span className="font-semibold text-emerald-600">
                          +{fridayBonus.toFixed(2)} ج.م
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="flex justify-between">
                  <span className="text-gray-600">إجمالي الخصومات:</span>
                  <span className="font-semibold text-rose-600">
                    -
                    {formData.deductions
                      .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
                      .toFixed(2)}{" "}
                    ج.م
                  </span>
                </div>
                {parseFloat(formData.penalties || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">جزاءات:</span>
                    <span className="font-semibold text-rose-600">
                      -{parseFloat(formData.penalties || 0).toFixed(2)} ج.م
                    </span>
                  </div>
                )}
                {parseFloat(formData.insurance || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">تأمين:</span>
                    <span className="font-semibold text-rose-600">
                      -{parseFloat(formData.insurance || 0).toFixed(2)} ج.م
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="font-semibold text-gray-800 text-lg">
                الصافي بعد جميع الخصومات:
              </span>
              <span className="text-2xl font-bold text-sky-600">
                {formData.netPay} ج.م
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingItem(null);
        }}
        title="عرض كشف الراتب"
        size="lg"
      >
        {viewingItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">معرف الكشف</p>
                <p className="font-semibold">{viewingItem.payslipId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الموظف</p>
                <p className="font-semibold">
                  {getEmployeeName(viewingItem.employeeId)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الفترة</p>
                <p className="font-semibold">
                  {viewingItem.periodStart} إلى {viewingItem.periodEnd}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">المرتب الأساسي</p>
                <p className="font-semibold">{viewingItem.basicSalary} ج.م</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">الحوافز</p>
                <p className="font-semibold">
                  {viewingItem.allowances || 0} ج.م
                </p>
              </div>
              {viewingItem.overtimeHours > 0 && (
                <div>
                  <p className="text-sm text-gray-600">الساعات الإضافية</p>
                  <p className="font-semibold text-emerald-600">
                    {viewingItem.overtimeHours} ساعة ×{" "}
                    {viewingItem.overtimeRate || 0} ={" "}
                    {(
                      viewingItem.overtimeHours *
                      (viewingItem.overtimeRate || 0)
                    ).toFixed(2)}{" "}
                    ج.م
                  </p>
                </div>
              )}
              {(() => {
                const basicSalary = parseFloat(viewingItem.basicSalary || 0);
                const fixedAllowance = parseFloat(viewingItem.allowances || 0);
                const daysInPeriod = getDaysInPeriod(viewingItem.periodStart, viewingItem.periodEnd);
                const hourlyRate = (basicSalary + fixedAllowance) / daysInPeriod / 8;
                const lateHrs = parseFloat(viewingItem.lateHours || 0);
                const earlyLeaveHrs = parseFloat(viewingItem.earlyLeaveHours || 0);
                const lateDeduction = lateHrs * hourlyRate;
                const earlyLeaveDeduction = earlyLeaveHrs * hourlyRate;
                
                return (
                  <>
                    {lateHrs > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">خصم التأخير</p>
                        <p className="font-semibold text-red-600">
                          {lateHrs} ساعة × {hourlyRate.toFixed(2)} = -{lateDeduction.toFixed(2)} ج.م
                        </p>
                      </div>
                    )}
                    {earlyLeaveHrs > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">خصم الانصراف المبكر</p>
                        <p className="font-semibold text-red-600">
                          {earlyLeaveHrs} ساعة × {hourlyRate.toFixed(2)} = -{earlyLeaveDeduction.toFixed(2)} ج.م
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
              {viewingItem.rewards > 0 && (
                <div>
                  <p className="text-sm text-gray-600">مكافآت</p>
                  <p className="font-semibold text-emerald-600">
                    +{viewingItem.rewards || 0} ج.م
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">
                  إجمالي الخصومات (أقساط السلف + غياب)
                </p>
                <p className="font-semibold text-rose-600">
                  {viewingItem.deductions
                    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
                    .toFixed(2)}{" "}
                  ج.م
                </p>
              </div>
              {viewingItem.penalties > 0 && (
                <div>
                  <p className="text-sm text-gray-600">جزاءات</p>
                  <p className="font-semibold text-rose-600">
                    -{viewingItem.penalties || 0} ج.م
                  </p>
                </div>
              )}
              {viewingItem.insurance > 0 && (
                <div>
                  <p className="text-sm text-gray-600">تأمين</p>
                  <p className="font-semibold text-rose-600">
                    -{viewingItem.insurance || 0} ج.م
                  </p>
                </div>
              )}
            </div>

          

            {viewingItem.deductions.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">تفاصيل الخصومات:</p>
                <div className="bg-gray-50 rounded p-3 space-y-2">
                  {viewingItem.deductions.map((ded, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{ded.type}</span>
                      <span className="font-semibold">{ded.amount} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">الصافي:</span>
                <span className="text-2xl font-bold text-sky-600">
                  {viewingItem.netPay} ج.م
                </span>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => handlePrint(viewingItem)}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                طباعة
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف كشف الراتب "${itemToDelete?.payslipId}"؟ سيتم إعادة حالة أقساط السلف المرتبطة.`}
        confirmText="حذف"
        cancelText="إلغاء"
        danger
      />

      <Modal
        isOpen={isPrintAllModalOpen}
        onClose={() => setIsPrintAllModalOpen(false)}
        title="طباعة كشوف الرواتب حسب المكان"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            الشهر المحدد: <strong>{selectedMonth || "—"}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المكان
            </label>
            <select
              value={printAllLocation}
              onChange={(e) => setPrintAllLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- اختر المكان --</option>
              <option value={PRINT_ALL_LOCATION_ALL}>جميع الأماكن</option>
              <option value="المكتب">المكتب</option>
              <option value="المصنع">المصنع</option>
              <option value="الموقع">الموقع</option>
            </select>
          </div>
          {printAllLocation && (
            <>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  اختر الموظفين للطباعة
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllPrintAll}
                    className="px-3 py-1 text-sm bg-sky-100 text-sky-700 rounded hover:bg-sky-200"
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllPrintAll}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                {printAllEmployeesInLocation.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    لا يوجد موظفون في هذا المكان
                  </p>
                ) : (
                  printAllEmployeesInLocation.map((emp) => (
                    <label
                      key={emp.employeeId}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={printAllSelectedIds.has(String(emp.employeeId ?? ""))}
                        onChange={() => togglePrintAllEmployee(emp.employeeId)}
                        className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                      />
                      <span className="text-sm text-gray-800">
                        {emp.name} ({emp.employeeId})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsPrintAllModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handlePrintAllFromModal}
              disabled={!printAllLocation || printAllSelectedIds.size === 0}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              طباعة
            </button>
          </div>
        </div>
      </Modal>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function ImportModal({ isOpen, onClose, onImport }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = (mode) => {
    if (!file) return;

    importFromExcel(
      file,
      (data) => onImport(data, mode),
      (error) => console.error("Import error:", error)
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="استيراد Excel" size="sm">
      <div className="space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            إلغاء
          </button>
          <button
            onClick={() => handleImport("merge")}
            disabled={!file}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
          >
            دمج
          </button>
          <button
            onClick={() => handleImport("replace")}
            disabled={!file}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50"
          >
            استبدال
          </button>
        </div>
      </div>
    </Modal>
  );
}

