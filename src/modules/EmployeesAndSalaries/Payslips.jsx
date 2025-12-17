import { useState, useEffect, useMemo } from "react";
import { useERPStorage } from "../../hooks/useERPStorage";
import { exportToExcel, importFromExcel } from "../../utils/excelUtils";
import { DataTable } from "../../components/DataTable";
import { Modal } from "../../components/Modal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { Toast } from "../../components/Toast";
import logoImage from "../../assets/logo.png";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
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

    loansData.forEach((loan) => {
      if (
        loan.employeeId === employeeId &&
        loan.schedule &&
        loan.schedule.length > 0
      ) {
        loan.schedule.forEach((installment, idx) => {
          const dueDate = new Date(installment.dueDate);
          const start = new Date(periodStart);
          const end = new Date(periodEnd);

          if (dueDate >= start && dueDate <= end && !installment.paid) {
            dueInstallments.push({
              type: `سلفة - ${loan.loanId}`,
              amount: installment.amount,
              source: "erp_loans",
              loanId: loan.loanId,
              scheduleIndex: idx,
            });
          }
        });
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
    const fridays = getFridaysInPeriod(periodStart, periodEnd).length;
    const presentDays = getAttendanceDays(employeeId, periodStart, periodEnd);
    const workingDays = Math.max(0, totalDays - fridays);
    return Math.max(0, workingDays - presentDays);
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

  const calculateOvertimeRate = (basicSalary, allowances) => {
    // سعر الساعة الإضافية = (الراتب الأساسي + الحافز) ÷ 30 يوم ÷ 8 ساعات
    const totalMonthly =
      parseFloat(basicSalary || 0) + parseFloat(allowances || 0);
    return totalMonthly / 30 / 8;
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
    const overtimePay = overtimeHrs * overtimeRt;
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
    const basicSalaryNum = parseFloat(basicSalary || 0);
    const allowancesNum = parseFloat(allowances || 0);
    const dailySalary = (basicSalaryNum + allowancesNum) / 30;
    const fridayBonus =
      fridayAttendanceDays > 0 ? dailySalary * fridayAttendanceDays : 0;

    // الصافي = الراتب + البدلات + الساعات الإضافية + المكافآت + مكافأة الجمعة - الخصومات - الجزاءات - التأمين
    return (
      salaryBasedOnAttendance +
      allow +
      overtimePay +
      rewardsAmount +
      fridayBonus -
      deduct -
      penaltiesAmount -
      insuranceAmount
    );
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

        // حساب سعر الساعة الإضافية
        const overtimeRate = calculateOvertimeRate(basicSalary, fixedAllowance);

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
        const dailySalary = totalMonthlySalary / 30; // ثابت 30 يوم

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
      penalties: parseFloat(formData.penalties) || 0,
      rewards: parseFloat(formData.rewards) || 0,
      insurance: parseFloat(formData.insurance) || 0,
      deductions: formData.deductions,
      netPay: parseFloat(formData.netPay) || 0,
    };

    if (editingItem) {
      // Rollback previous loan deductions
      if (editingItem.deductions) {
        editingItem.deductions.forEach((ded) => {
          if (ded.source === "erp_loans" && ded.loanId) {
            const loan = loansData.find((l) => l.loanId === ded.loanId);
            if (loan && loan.schedule && ded.scheduleIndex !== undefined) {
              const schedule = [...loan.schedule];
              if (schedule[ded.scheduleIndex]) {
                schedule[ded.scheduleIndex].paid = false;
                const newRemaining = loan.remainingAmount + ded.amount;
                updateLoan(
                  loan.loanId,
                  {
                    schedule: schedule,
                    remainingAmount: newRemaining,
                  },
                  "loanId"
                );
              }
            }
          }
        });
      }

      // Apply new deductions
      payslip.deductions.forEach((ded) => {
        if (ded.source === "erp_loans" && ded.loanId) {
          const loan = loansData.find((l) => l.loanId === ded.loanId);
          if (loan && loan.schedule && ded.scheduleIndex !== undefined) {
            const schedule = [...loan.schedule];
            if (
              schedule[ded.scheduleIndex] &&
              !schedule[ded.scheduleIndex].paid
            ) {
              schedule[ded.scheduleIndex].paid = true;
              const newRemaining = Math.max(
                0,
                loan.remainingAmount - ded.amount
              );
              updateLoan(
                loan.loanId,
                {
                  schedule: schedule,
                  remainingAmount: newRemaining,
                },
                "loanId"
              );
            }
          }
        }
      });

      updateItem(editingItem.payslipId, payslip, "payslipId");
      showToast("تم تحديث كشف الراتب بنجاح");
    } else {
      // Apply loan deductions
      payslip.deductions.forEach((ded) => {
        if (ded.source === "erp_loans" && ded.loanId) {
          const loan = loansData.find((l) => l.loanId === ded.loanId);
          if (loan && loan.schedule && ded.scheduleIndex !== undefined) {
            const schedule = [...loan.schedule];
            if (
              schedule[ded.scheduleIndex] &&
              !schedule[ded.scheduleIndex].paid
            ) {
              schedule[ded.scheduleIndex].paid = true;
              const newRemaining = Math.max(
                0,
                loan.remainingAmount - ded.amount
              );
              updateLoan(
                loan.loanId,
                {
                  schedule: schedule,
                  remainingAmount: newRemaining,
                },
                "loanId"
              );
            }
          }
        }
      });

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

  const confirmDelete = () => {
    if (itemToDelete) {
      // Rollback loan deductions
      if (itemToDelete.deductions) {
        itemToDelete.deductions.forEach((ded) => {
          if (ded.source === "erp_loans" && ded.loanId) {
            const loan = loansData.find((l) => l.loanId === ded.loanId);
            if (loan && loan.schedule && ded.scheduleIndex !== undefined) {
              const schedule = [...loan.schedule];
              if (
                schedule[ded.scheduleIndex] &&
                schedule[ded.scheduleIndex].paid
              ) {
                schedule[ded.scheduleIndex].paid = false;
                const newRemaining = loan.remainingAmount + ded.amount;
                updateLoan(
                  loan.loanId,
                  {
                    schedule: schedule,
                    remainingAmount: newRemaining,
                  },
                  "loanId"
                );
              }
            }
          }
        });
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
            <div class="metric"><strong>البدلات:</strong> ${item.allowances || 0} ج.م</div>
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
            <div class="metric"><strong>الخصومات (أقساط السلف + غياب):</strong> ${item.deductions
              .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
              .toFixed(2)} ج.م</div>
            ${
              item.penalties > 0
                ? `<div class="metric"><strong>جزاءات:</strong> ${item.penalties} ج.م</div>`
                : ""
            }
            ${
              item.insurance > 0
                ? `<div class="metric"><strong>تأمين:</strong> ${item.insurance} ج.م</div>`
                : ""
            }
          </div>
          <table class="netpay-table">
            <thead>
              <tr>
                <th>الصافي</th>
                <td><strong>${item.netPay} ج.م</strong></td>
              </tr>
            </thead>
          </table>
          ${
            item.deductions.length > 0
              ? (() => {
                  const absentDaysForPeriod = getAbsentDays(
                    item.employeeId,
                    item.periodStart,
                    item.periodEnd
                  );
                  return `
                  <h3>تفاصيل الخصومات:</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
                    <thead>
                      <tr>
                        <th style="text-align:center; border: 1px solid #000; padding: 6px;">النوع</th>
                        <th style="text-align:center; border: 1px solid #000; padding: 6px;">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${item.deductions
                        .map((d) => {
                          const absentInfo =
                            (d.type || "").includes("غياب") && absentDaysForPeriod > 0
                              ? ` (أيام الغياب: ${absentDaysForPeriod})`
                              : "";
                          return `<tr>
                            <td style="text-align:center; border: 1px solid #000; padding: 6px;">${d.type}${absentInfo}</td>
                            <td style="text-align:center; border: 1px solid #000; padding: 6px;">${parseFloat(d.amount || 0).toFixed(2)} ج.م</td>
                          </tr>`;
                        })
                        .join("")}
                    </tbody>
                  </table>
                `;
                })()
              : ""
          }
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

  const handlePrintAllMonthly = async () => {
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

    const perEmployeeList = Object.values(perEmployee);
    const totalNet = perEmployeeList.reduce(
      (sum, item) => sum + (parseFloat(item.netPay) || 0),
      0
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
      const attendanceDays = getAttendanceDays(
        item.employeeId,
        item.periodStart,
        item.periodEnd
      );
      return `
        <tr>
          <td>${employee ? employee.name : item.employeeId}</td>
          <td>${item.basicSalary}</td>
          <td>${item.allowances || 0}</td>
          <td>${overtimePay.toFixed(2)}</td>
          <td>${item.rewards || 0}</td>
          <td>${loanDeductions.toFixed(2)}</td>
          <td>${item.penalties || 0}</td>
          <td>${item.insurance || 0}</td>
          <td>${getAbsentDays(
            item.employeeId,
            item.periodStart,
            item.periodEnd
          )}</td>
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
                <th>البدلات</th>
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
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            تصدير Excel
          </button>
          <button
            onClick={handlePrintAllMonthly}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            طباعة الكل (الشهر)
          </button>
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
        </div>
      </div>

      <DataTable
        data={filteredPayslips}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchFields={["payslipId", "employeeId"]}
      />

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
                البدلات
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
                title="يتم حسابه تلقائياً: (الراتب الأساسي + الحافز) ÷ 30 ÷ 8"
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
                  const dailySalary = totalMonthlySalary / 30;
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
                            الراتب اليومي: {totalMonthlySalary.toFixed(2)} ÷ 30
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
                                  ساعة × {overtimeRate.toFixed(2)} (الراتب ÷ 30
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
                  <span className="text-gray-600">البدلات:</span>
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
                  const dailySalary = (basicSalary + fixedAllowance) / 30;
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
                <p className="text-sm text-gray-600">البدلات</p>
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
