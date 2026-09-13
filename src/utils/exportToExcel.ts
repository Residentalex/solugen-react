import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { companiaApi } from '../api/companiaApi';

/* ───── Cache de nombre de compañía ───── */

const CACHE_KEY = 'paces_company_name';

function asegurarExtensionXlsx(fileName: string): string {
  return /\.xlsx$/i.test(fileName) ? fileName : `${fileName}.xlsx`;
}

/**
 * Obtiene el nombre de la compañía activa, con caché en sessionStorage.
 * Si falla la API, retorna 'SOLUGEN S.R.L.' como fallback.
 */
export async function getCompanyName(sucursalActiva: number): Promise<string> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return cached;

    const lista = await companiaApi.obtenerTodas(sucursalActiva);
    const name = lista.length > 0 && lista[0].nombre
      ? String(lista[0].nombre)
      : 'SOLUGEN S.R.L.';

    sessionStorage.setItem(CACHE_KEY, name);
    return name;
  } catch {
    return 'SOLUGEN S.R.L.';
  }
}

/* ───── Opciones del exportador ───── */

export interface ExportToExcelOptions {
  /** Nombre de la compañía que aparece en la primera fila */
  companyName: string;
  /** Filas adicionales entre la compañía y los encabezados de columna (título, período, etc.) */
  extraHeaderRows?: any[][];
  /** Nombres de las columnas */
  columnHeaders: string[];
  /** Filas de datos (array de arrays, SIN incluir encabezados) */
  dataRows: any[][];
  /** Nombre de la hoja (default: 'Sheet1') */
  sheetName?: string;
  /** Nombre del archivo de salida (default: auto) */
  fileName?: string;
  /** Número de columnas a fusionar en la fila de compañía y extraHeaderRows (default: 3) */
  mergeCols?: number;
  /** Anchos de columna opcionales */
  columnWidths?: ({ wch: number } | undefined)[];
}

/* ───── Función principal de exportación ───── */

/**
 * Exporta datos a Excel agregando automáticamente:
 * - Fila superior con el nombre de la compañía (negrita, tamaño 14, fusionada)
 * - Filas adicionales de encabezado (fusionadas)
 * - Fila de encabezados de columna (negrita, tamaño 11)
 * - Dispara la descarga del archivo .xlsx
 */
export function exportToExcel(options: ExportToExcelOptions): void {
  const {
    companyName,
    extraHeaderRows = [],
    columnHeaders,
    dataRows,
    sheetName = 'Sheet1',
    fileName,
    mergeCols = 3,
    columnWidths,
  } = options;

  // Construir el array de arrays completo
  const aoa: any[][] = [
    [companyName],
    ...extraHeaderRows,
    columnHeaders,
    ...dataRows,
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const ncols = columnHeaders.length;

  // ── Anchos de columna ──
  if (columnWidths) {
    ws['!cols'] = columnWidths;
  } else {
    ws['!cols'] = Array.from({ length: ncols }, () => ({ wch: 18 }));
  }

  // ── Fusiones (merges) ──
  const totalHeaderRows = 1 + extraHeaderRows.length;
  const merges: XLSX.Range[] = [];
  const mergeLimit = Math.min(mergeCols - 1, ncols - 1);
  for (let r = 0; r < totalHeaderRows; r++) {
    merges.push({
      s: { r, c: 0 },
      e: { r, c: mergeLimit },
    });
  }
  ws['!merges'] = merges;

  // ── Altura de filas y estilos ──
  ws['!rows'] = ws['!rows'] || [];

  // Fila 0: nombre de la compañía → negrita, tamaño 14
  ws['!rows'][0] = { hpx: 24 };
  for (let c = 0; c < ncols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true, sz: 14 } };
  }

  // Fila de encabezados de columna → negrita, tamaño 11
  const headerRowIdx = totalHeaderRows;
  for (let c = 0; c < ncols; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true, sz: 11 } };
  }

  // ── Agregar hoja y descargar ──
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const defaultFileName = `${sheetName.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, asegurarExtensionXlsx(fileName || defaultFileName));
}

/* ───── Exportación multi-hoja ───── */

export interface ExportToExcelSheetOptions {
  /** Nombre de la hoja */
  sheetName: string;
  /** Filas adicionales entre la compañía y los encabezados de columna */
  extraHeaderRows?: any[][];
  /** Nombres de las columnas */
  columnHeaders: string[];
  /** Filas de datos */
  dataRows: any[][];
  /** Anchos de columna opcionales */
  columnWidths?: ({ wch: number } | undefined)[];
}

export interface ExportToExcelMultiSheetOptions {
  /** Nombre de la compañía que aparece en la primera fila de cada hoja */
  companyName: string;
  /** Datos de cada hoja */
  sheets: ExportToExcelSheetOptions[];
  /** Nombre del archivo de salida (default: auto) */
  fileName?: string;
  /** Número de columnas a fusionar en la fila de compañía y extraHeaderRows (default: 3) */
  mergeCols?: number;
}

/**
 * Exporta múltiples hojas a un solo archivo .xlsx.
 * Cada hoja recibe el nombre de la compañía, encabezados extra y datos propios.
 */
export function exportToExcelMultiSheet(options: ExportToExcelMultiSheetOptions): void {
  const {
    companyName,
    sheets,
    fileName,
    mergeCols = 3,
  } = options;

  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const { sheetName, extraHeaderRows = [], columnHeaders, dataRows, columnWidths } = sheet;

    const aoa: any[][] = [
      [companyName],
      ...extraHeaderRows,
      columnHeaders,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ncols = columnHeaders.length;

    // ── Anchos de columna ──
    if (columnWidths) {
      ws['!cols'] = columnWidths;
    } else {
      ws['!cols'] = Array.from({ length: ncols }, () => ({ wch: 18 }));
    }

    // ── Fusiones (merges) ──
    const totalHeaderRows = 1 + extraHeaderRows.length;
    const merges: XLSX.Range[] = [];
    const mergeLimit = Math.min(mergeCols - 1, ncols - 1);
    for (let r = 0; r < totalHeaderRows; r++) {
      merges.push({
        s: { r, c: 0 },
        e: { r, c: mergeLimit },
      });
    }
    ws['!merges'] = merges;

    // ── Altura de filas y estilos ──
    ws['!rows'] = ws['!rows'] || [];
    ws['!rows'][0] = { hpx: 24 };
    for (let c = 0; c < ncols; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true, sz: 14 } };
    }

    const headerRowIdx = totalHeaderRows;
    for (let c = 0; c < ncols; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (!ws[addr]) continue;
      ws[addr].s = { font: { bold: true, sz: 11 } };
    }

    // ── Sanitizar nombre de hoja (Excel max 31 chars, sin caracteres especiales) ──
    const safeName = sheetName.replace(/[\\/\?*\[\]:]/g, '_').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const defaultFileName = `MayorAuxiliar_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, asegurarExtensionXlsx(fileName || defaultFileName));
}
