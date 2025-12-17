import * as XLSX from 'xlsx';

export const exportToExcel = (
  data,
  sheetName = 'Sheet1',
  fileName = 'export.xlsx',
  header
) => {
  const worksheet = XLSX.utils.json_to_sheet(data || [], header ? { header } : undefined);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

// يدعم تصدير عدة شيتات في ملف واحد
export const exportWorkbook = (sheets = [], fileName = 'export.xlsx') => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const { data = [], sheetName = 'Sheet1', header } = sheet || {};
    const worksheet = XLSX.utils.json_to_sheet(data, header ? { header } : undefined);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  XLSX.writeFile(workbook, fileName);
};

// يدعم اختيار شيت محدد بالاسم، أو أول شيت إذا لم يحدد
export const importFromExcel = (file, onSuccess, onError, sheetName) => {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const arrayBuffer = event.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const targetSheetName =
        sheetName && workbook.SheetNames.includes(sheetName)
          ? sheetName
          : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[targetSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      onSuccess?.(jsonData);
    } catch (error) {
      onError?.(error);
    }
  };

  reader.onerror = (error) => {
    onError?.(error);
  };

  reader.readAsArrayBuffer(file);
};


