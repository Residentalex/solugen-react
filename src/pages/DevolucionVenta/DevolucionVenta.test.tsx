import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DevolucionVenta from './DevolucionVenta';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/devolucionVentaApi');
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

const mockDevoluciones: any[] = [
  { id: 1, documento: 'DEV001', fecha: '20240115000000', entidad: 'Cliente A', referencia: 'FC001', concepto: 'Devolución de venta', almacen: 'Almacen Principal', ncf: 'NCF001', total: 600, estado: 1, periodo: 0 },
  { id: 2, documento: 'DEV002', fecha: '20240116000000', entidad: 'Cliente B', referencia: 'FC002', concepto: 'Producto dañado', almacen: 'Almacen Secundario', ncf: '', total: 250, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('DevolucionVenta', () => {
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
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      expect(devolucionVentaApi.obtenerVista).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('DEV001')).toBeInTheDocument();
        expect(screen.getByText('DEV002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (devolucionVentaApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar devoluciones de venta/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (devolucionVentaApi.filtrar as any).mockResolvedValue([mockDevoluciones[0]]);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, ncf, concepto/i);
      await userEvent.type(searchInput, 'DEV001');
      await userEvent.keyboard('{enter}');
      expect(devolucionVentaApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('DEV001')).toBeInTheDocument();
        expect(screen.queryByText('DEV002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(devolucionVentaApi.obtenerVista).toHaveBeenCalledWith(1, '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DEV001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FDEV/nuevo');
    });
    test('document link has correct href', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DEV001')).toBeInTheDocument());
      expect(screen.getByText('DEV001').closest('a')).toHaveAttribute('href', '/FDEV/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DEV001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('DEV001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/facturacion/devolucion/1/${mockDevoluciones[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue([{ ...mockDevoluciones[0], estado: 0 }]);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DEV001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('DEV001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FDEV/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (devolucionVentaApi.obtenerVista as any).mockResolvedValue(mockDevoluciones);
      render(<MemoryRouter><DevolucionVenta /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DEV001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Factura', 'Concepto', 'Almacén', 'NCF', 'Total', 'Estado']));
    });
  });
});
