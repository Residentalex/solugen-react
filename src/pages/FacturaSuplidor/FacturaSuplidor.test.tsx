import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacturaSuplidor from './FacturaSuplidor';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/facturaSuplidorApi');
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

const mockFacturas: any[] = [
  { id: 1, documento: 'FS001', fecha: '20240115000000', entidad: 'Suplidor A', concepto: 'Compra de materiales', ncf: 'NCF001', total: 2500, estado: 1, periodo: 0 },
  { id: 2, documento: 'FS002', fecha: '20240116000000', entidad: 'Suplidor B', concepto: 'Servicios contratados', ncf: '', total: 1200, estado: 0, periodo: 0 },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('FacturaSuplidor', () => {
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
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      expect(facturaSuplidorApi.obtenerVista).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('FS001')).toBeInTheDocument();
        expect(screen.getByText('FS002')).toBeInTheDocument();
      });
    });
    test('handles error state', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar facturas de suplidor/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (facturaSuplidorApi.filtrar as any).mockResolvedValue([mockFacturas[0]]);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, ncf, concepto/i);
      await userEvent.type(searchInput, 'FS001');
      await userEvent.keyboard('{enter}');
      expect(facturaSuplidorApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('FS001')).toBeInTheDocument();
        expect(screen.queryByText('FS002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(facturaSuplidorApi.obtenerVista).toHaveBeenCalledWith(1, '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FS001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FRDE/nuevo');
    });
    test('document link has correct href', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FS001')).toBeInTheDocument());
      expect(screen.getByText('FS001').closest('a')).toHaveAttribute('href', '/FRDE/1');
    });
  });

  describe('Print', () => {
    test('opens print preview', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FS001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('FS001').closest('tr')!);
      const printBtn = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printBtn).not.toBeNull();
      await userEvent.click(printBtn!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/contabilidad/facturaSuplidor/1/${mockFacturas[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue([{ ...mockFacturas[0], estado: 0 }]);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FS001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('FS001').closest('tr')!);
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FRDE/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (facturaSuplidorApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaSuplidor /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FS001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Suplidor', 'Concepto', 'NCF', 'Total', 'Estado']));
    });
  });
});
