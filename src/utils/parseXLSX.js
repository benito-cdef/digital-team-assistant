import * as XLSX from 'xlsx';

export async function parseXLSX(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, columns };
}
