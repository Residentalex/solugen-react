import * as XLSX from 'xlsx';

export interface FilaErrorImportacion {
  fila: number;
  mensaje: string;
}

/**
 * Genera y descarga un Excel con los errores de una importacion por plantilla.
 * Centralizado aqui para no importar XLSX directamente en las paginas.
 */
export function exportarErroresImportacion(
  errores: FilaErrorImportacion[],
  nombreArchivo: string
): void {
  const filas = errores.map((e, i) => ({
    'Nº': i + 1,
    'Fila': e.fila,
    'Error': e.mensaje,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Errores');
  XLSX.writeFile(wb, nombreArchivo);
}
