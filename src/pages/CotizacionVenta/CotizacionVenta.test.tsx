import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CotizacionVenta from './CotizacionVenta';
import { cotizacionVentaApi } from '../../api/cotizacionVentaApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/cotizacionVentaApi');
vi.mock('../../api/client');
vi.mock('../../stores/authStore');
vi.mock('../../stores/uiStore');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: vi.fn() };
});
vi.mock('../../components/PermissionGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/FiltrosDocumento/FiltrosDocumento', () => ({
  __esModule: true,
  default: ({ onAplicar }: { onAplicar: (n: { desde?: string; hasta?: string; estado?: number }) => void }) => (
    <div data-testid="filtros-documento">
      <button onClick={() => onAplicar({ desde: '20240101000000', hasta: '20241231235959', estado: 1 })}>Aplicar Filtro</button>
    </div>
  ),
}));

const mockCotizaciones: any[] = [
  { id: 1, documento: 'COT001', fecha: '20240115000000', entidad: 'Cliente A', concepto: 'Cotización de productos', ncf: '', total: 3000, estado: 1, periodo: 0 },
  { id: 2, documento: 'COT002', fecha: '20240116000000', entidad: 'Cliente B', concepto: 'Servicios', ncf: '', total: 1500, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('CotizacionVenta', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as any).mockReturnValue(navigateMock);
    (useAuthStore as any).mockImplementation((s: any) => s({ sucursalActiva: 1 }));
    (useUIStore as any).mockImplementation((s: any) => s({ resetToolbar: vi.fn(), setActiveModule: vi.fn(), setNuevoCallback: vi.fn() }));
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      expect(cotizacionVentaApi.obtenerVista).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('COT001')).toBeInTheDocument();
        expect(screen.getByText('COT002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar cotizaciones/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (cotizacionVentaApi.filtrar as any).mockResolvedValue([mockCotizaciones[0]]);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, concepto, cliente/i);
      await userEvent.type(searchInput, 'COT001');
      await userEvent.keyboard('{enter}');
      expect(cotizacionVentaApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('COT001')).toBeInTheDocument();
        expect(screen.queryByText('COT002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(cotizacionVentaApi.obtenerVista).toHaveBeenCalledWith(1, '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('COT001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FCotizacion/nuevo');
    });
    test('document link has correct href', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('COT001')).toBeInTheDocument());
      expect(screen.getByText('COT001').closest('a')).toHaveAttribute('href', '/FCotizacion/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('COT001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('COT001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/facturacion/cotizacionVenta/1/${mockCotizaciones[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue([{ ...mockCotizaciones[0], estado: 0 }]);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('COT001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('COT001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FCotizacion/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (cotizacionVentaApi.obtenerVista as any).mockResolvedValue(mockCotizaciones);
      render(<MemoryRouter><CotizacionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('COT001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Concepto', 'NCF', 'Total', 'Estado']));
    });
  });
});
