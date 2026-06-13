import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacturaCliente from './FacturaCliente';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import { apiClient } from '../../api/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

vi.mock('../../api/facturaClienteApi');
vi.mock('../../api/client');
vi.mock('../../stores/authStore');
vi.mock('../../stores/uiStore');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});
vi.mock('../../components/PermissionGate', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/FiltrosDocumento/FiltrosDocumento', () => ({
  __esModule: true,
  default: ({
    onAplicar,
  }: {
    onAplicar: (nuevos: { desde?: string; hasta?: string; estado?: number }) => void;
  }) => (
    <div data-testid="filtros-documento">
      <button onClick={() => onAplicar({ desde: '20240101000000', hasta: '20241231235959', estado: 1 })}>
        Aplicar Filtro
      </button>
    </div>
  ),
}));

const mockFacturas: any[] = [
  {
    id: 1, documento: 'FC001', fecha: '20240115000000',
    entidad: 'Cliente A', concepto: 'Venta de productos',
    ncf: 'NCF001', total: 1500, estado: 1, periodo: 0, identificacion: '123456789',
  },
  {
    id: 2, documento: 'FC002', fecha: '20240116000000',
    entidad: 'Cliente B', concepto: 'Servicios profesionales',
    ncf: '', total: 800, estado: 0, periodo: 0,
  },
];
const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

describe('FacturaCliente', () => {
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateMock = vi.fn();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(navigateMock);
    (useAuthStore as ReturnType<typeof vi.fn>).mockImplementation((s: any) => s({ sucursalActiva: 1 }));
    (useUIStore as ReturnType<typeof vi.fn>).mockImplementation((s: any) =>
      s({ resetToolbar: vi.fn(), setActiveModule: vi.fn(), setNuevoCallback: vi.fn() })
    );
    vi.clearAllMocks();
  });

  describe('Initial Load', () => {
    test('loads data on mount and renders documents', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      expect(facturaClienteApi.obtenerVista).toHaveBeenCalledWith(1, expect.any(String), expect.any(String), 25, 0, undefined);
      await waitFor(() => {
        expect(screen.getByText('FC001')).toBeInTheDocument();
        expect(screen.getByText('FC002')).toBeInTheDocument();
      });
    });

    test('handles error state', async () => {
      (facturaClienteApi.obtenerVista as any).mockRejectedValue(new Error('API Error'));
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => {
        expect(screen.getByText(/error al cargar facturas de cliente/i)).toBeInTheDocument();
        expect(screen.getByText(/reintentar/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search', () => {
    test('searches by document', async () => {
      (facturaClienteApi.filtrar as any).mockResolvedValue([mockFacturas[0]]);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      const searchInput = screen.getByPlaceholderText(/buscar documento, ncf, concepto/i);
      await userEvent.type(searchInput, 'FC001');
      await userEvent.keyboard('{enter}');
      expect(facturaClienteApi.filtrar).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('FC001')).toBeInTheDocument();
        expect(screen.queryByText('FC002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filters', () => {
    test('applies date and estado filters', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await userEvent.click(screen.getByRole('button', { name: /aplicar filtro/i }));
      expect(facturaClienteApi.obtenerVista).toHaveBeenCalledWith(1, '20240101000000', '20241231235959', 25, 0, 1);
    });
  });

  describe('Navigation', () => {
    test('navigates to create page when Nuevo button clicked', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FC001')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /nuevo/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FFAC/nuevo');
    });

    test('document link has correct href', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FC001')).toBeInTheDocument());
      expect(screen.getByText('FC001').closest('a')).toHaveAttribute('href', '/FFAC/1');
    });
  });

  describe('Print', () => {
    test('opens print preview when print button clicked', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      (apiClient.get as any).mockResolvedValue({ data: mockPdfBlob });
      const { container } = render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FC001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('FC001').closest('tr')!);
      const printButton = container.querySelector('[data-icon="printer"]')?.closest('button');
      expect(printButton).not.toBeNull();
      await userEvent.click(printButton!);
      expect(apiClient.get).toHaveBeenCalledWith(`/reportes/contabilidad/factura-cliente/1/${mockFacturas[0].id}`, { responseType: 'blob' });
    });
  });

  describe('Edit', () => {
    test('navigates to edit page when edit button clicked with editable document', async () => {
      const editableDoc = { ...mockFacturas[0], estado: 0 };
      (facturaClienteApi.obtenerVista as any).mockResolvedValue([editableDoc]);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FC001')).toBeInTheDocument());
      await userEvent.click(screen.getByText('FC001').closest('tr')!);
      expect(screen.getByRole('button', { name: /editar/i })).toBeEnabled();
      await userEvent.click(screen.getByRole('button', { name: /editar/i }));
      expect(navigateMock).toHaveBeenCalledWith('/FFAC/1/editar');
    });
  });

  describe('Columns', () => {
    test('renders expected column headers', async () => {
      (facturaClienteApi.obtenerVista as any).mockResolvedValue(mockFacturas);
      render(<MemoryRouter><FacturaCliente /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('FC001')).toBeInTheDocument());
      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
      expect(headers).toEqual(expect.arrayContaining(['Documento', 'Cliente', 'Concepto', 'Total', 'NCF', 'Estado']));
    });
  });
});
