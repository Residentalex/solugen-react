import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DistribucionBalance from './DistribucionBalance';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/distribucionBalanceApi');
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

const mockDistribuciones: any[] = [
  { id: 1, documento: 'DBA001', fecha: '20240115000000', entidad: 'Cliente A', concepto: 'Distribución de balance', total: 5000, estado: 1, periodo: 0 },
  { id: 2, documento: 'DBA002', fecha: '20240116000000', entidad: 'Cliente B', concepto: 'Ajuste de cierre', total: 2000, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('DistribucionBalance', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as any).mockReturnValue(navigateMock);
    (useAuthStore as any).mockImplementation((s: any) => s({ sucursalActiva: 1 }));
    (useUIStore as any).mockImplementation((s: any) => s({ resetToolbar: vi.fn(), setActiveModule: vi.fn(), setNuevoCallback: vi.fn() }));
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount with tipoEntidad=CLI', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      expect(distribucionBalanceApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('DBA001')).toBeInTheDocument();
        expect(screen.getByText('DBA002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar distribuciones de balance/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (distribucionBalanceApi.filtrar as any).mockResolvedValue([mockDistribuciones[0]]);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, concepto/i);
      await userEvent.type(searchInput, 'DBA001');
      await userEvent.keyboard('{enter}');
      expect(distribucionBalanceApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('DBA001')).toBeInTheDocument();
        expect(screen.queryByText('DBA002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(distribucionBalanceApi.obtenerVista).toHaveBeenCalledWith(1, 'CLI', '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FDBACLI/nuevo');
    });
    test('document link has correct href', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      expect(screen.getByText('DBA001').closest('a')).toHaveAttribute('href', '/FDBACLI/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('DBA001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/contabilidad/distribucion-balance/1/${mockDistribuciones[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue([{ ...mockDistribuciones[0], estado: 0 }]);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('DBA001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FDBACLI/1/editar');
    });
  });

  describe('TipoEntidad', () => {
    test('renders Suplidor column for SUP', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="SUP" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Suplidor']));
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (distribucionBalanceApi.obtenerVista as any).mockResolvedValue(mockDistribuciones);
      render(<MemoryRouter><DistribucionBalance tipoEntidad="CLI" /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('DBA001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Concepto', 'Total', 'Estado']));
    });
  });
});
