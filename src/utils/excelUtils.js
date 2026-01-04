import * as XLSX from 'xlsx';

export const exportToExcel = (data, sheetName = 'Sheet1', fileName = 'export.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(data || []);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  XLSX.writeFile(workbook, fileName);
};

export const importFromExcel = (file, onSuccess, onError) => {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const arrayBuffer = event.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
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




