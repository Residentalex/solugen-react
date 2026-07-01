import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

// ============================================================
// DTOs
// ============================================================

export interface CierreFiscalItem {
  transacId: number;
  numeroDocumento: string;
  fecha: string;
  totalDebitos: number;
  totalCreditos: number;
}

export interface ResultadoCierre {
  numeroCuenta: string;
  descripcion: string;
  balanceAnterior: number;
  balance: number;
  debitosAcum: number;
  creditosAcum: number;
  balanceCierre: number;
  fechaPeriodo: string;
  cierreId?: number;
  transacId?: number;
  grupoCta?: string;
  tipo?: string;
}

// ============================================================
// API Client
// ============================================================

const BASE = 'CierreFiscal';

export const cierreFiscalApi = {
  listarCierres: async (): Promise<CierreFiscalItem[]> => {
    const { data } = await apiClient.get<ApiResponse<CierreFiscalItem[]>>(`${BASE}/Listar`);
    return data.data ?? [];
  },

  obtenerResultadosPorCierre: async (sucursal: number, transacId: number): Promise<ResultadoCierre[]> => {
    const { data } = await apiClient.get<ApiResponse<ResultadoCierre[]>>(`${BASE}/${sucursal}/Resultados`, {
      params: { transacId }
    });
    return data.data ?? [];
  },
};
